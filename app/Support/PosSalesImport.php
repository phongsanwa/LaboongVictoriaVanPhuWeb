<?php

namespace App\Support;

use Illuminate\Support\Str;
use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

/**
 * Reads a POS sales export (.csv or .xlsx) and matches item names to recipes.
 * Sizes come from a size column or from the item name ("(L)", "Size M", "Lớn"/"Nhỏ");
 * rows without a size count as L.
 */
class PosSalesImport
{
    private const NAME_HEADERS = ['ten hang', 'ten hang hoa', 'ten mon', 'ten san pham', 'san pham', 'mat hang', 'hang hoa', 'mon', 'item', 'item name', 'name', 'product', 'product name'];
    private const QTY_HEADERS = ['so luong', 'so luong ban', 'sl', 'sl ban', 'qty', 'quantity'];
    private const SIZE_HEADERS = ['size', 'kich co', 'kich thuoc', 'bien the', 'thuoc tinh', 'variant'];
    private const SIZE_WORDS = ['l' => 'L', 'lon' => 'L', 'large' => 'L', 'm' => 'M', 'nho' => 'M', 'vua' => 'M', 'medium' => 'M'];

    /** @param array<int, array{id:int, name:string}> $recipes */
    public function __construct(private array $recipes) {}

    public function import(string $path, string $extension): array
    {
        $rows = strtolower($extension) === 'xlsx' ? $this->readXlsx($path) : $this->readCsv($path);
        [$nameCol, $qtyCol, $sizeCol, $start] = $this->locateColumns($rows);

        $byRecipe = [];
        $unmatched = [];
        $seen = [];
        $unsized = 0;

        foreach (array_slice($rows, $start) as $row) {
            $rawName = trim((string) ($row[$nameCol] ?? ''));
            $qty = $this->number($row[$qtyCol] ?? null);
            if ($rawName === '' || $qty === null || $qty <= 0) continue;

            $norm = self::normalize($rawName);
            if (str_starts_with($norm, 'tong')) continue; // "Tổng cộng" summary rows

            $size = $sizeCol !== null ? $this->sizeFromText((string) ($row[$sizeCol] ?? '')) : null;
            [$base, $nameSize] = $this->splitSize($norm);
            $size ??= $nameSize;

            $seen[$base] = true;
            $recipeId = $this->match($base);
            if ($recipeId === null) { $unmatched[$base] = $rawName; continue; }
            if ($size === null) { $size = 'L'; $unsized += (int) round($qty); }

            $byRecipe[$recipeId] ??= ['qty_m' => 0, 'qty_l' => 0];
            $byRecipe[$recipeId][$size === 'M' ? 'qty_m' : 'qty_l'] += (int) round($qty);
        }

        if (!$seen) {
            throw new RuntimeException('Không tìm thấy dòng bán hàng nào. Kiểm tra file có cột tên món và số lượng.');
        }

        $matchedNames = count($seen) - count($unmatched);

        return [
            'matched'       => collect($byRecipe)->map(fn ($q, $id) => ['recipe_id' => $id] + $q)->values()->all(),
            'unmatched'     => array_values($unmatched),
            'total_names'   => count($seen),
            'matched_names' => $matchedNames,
            'unsized_cups'  => $unsized,
        ];
    }

    public static function normalize(string $s): string
    {
        $s = Str::lower(Str::ascii($s));
        $s = trim(preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9]+/', ' ', $s)));
        return preg_replace('/\bolong\b/', 'o long', $s);
    }

    private function match(string $base): ?int
    {
        $best = null;
        $bestLen = 0;
        foreach ($this->recipes as $r) {
            $rn = self::normalize($r['name']);
            if ($rn === $base) return $r['id'];
            if ($rn !== '' && (str_contains(" $base ", " $rn ") || str_contains(" $rn ", " $base ")) && strlen($rn) > $bestLen) {
                $best = $r['id'];
                $bestLen = strlen($rn);
            }
        }
        return $best;
    }

    /** Strips a trailing size marker from a normalized name: "... size l", "... (l)", "... lon". */
    private function splitSize(string $norm): array
    {
        if (preg_match('/^(.*?)\s+(?:size\s+)?(l|m|lon|nho|vua|large|medium)$/', $norm, $m) && $m[1] !== '') {
            return [trim($m[1]), self::SIZE_WORDS[$m[2]]];
        }
        if (preg_match('/^size\s+(l|m)\s+(.+)$/', $norm, $m)) {
            return [trim($m[2]), self::SIZE_WORDS[$m[1]]];
        }
        return [$norm, null];
    }

    private function sizeFromText(string $text): ?string
    {
        $n = preg_replace('/^size\s+/', '', self::normalize($text));
        return self::SIZE_WORDS[$n] ?? null;
    }

    private function number(mixed $v): ?float
    {
        if (is_int($v) || is_float($v)) return (float) $v;
        $s = trim((string) $v);
        if ($s === '') return null;
        $s = str_replace([' ', "\u{00A0}"], '', $s);
        if (preg_match('/^\d{1,3}([.,]\d{3})+$/', $s)) $s = str_replace(['.', ','], '', $s); // thousands separators
        $s = str_replace(',', '.', $s);
        return is_numeric($s) ? (float) $s : null;
    }

    /** @return array{0:int, 1:int, 2:?int, 3:int} name col, qty col, size col, first data row */
    private function locateColumns(array $rows): array
    {
        foreach (array_slice($rows, 0, 20, true) as $i => $row) {
            $name = $qty = $size = null;
            foreach ($row as $c => $cell) {
                $h = self::normalize((string) $cell);
                if ($name === null && in_array($h, self::NAME_HEADERS, true)) $name = $c;
                elseif ($qty === null && in_array($h, self::QTY_HEADERS, true)) $qty = $c;
                elseif ($size === null && in_array($h, self::SIZE_HEADERS, true)) $size = $c;
            }
            if ($name !== null && $qty !== null) return [$name, $qty, $size, $i + 1];
        }
        // No header row: assume "name, quantity" in the first two columns.
        return [0, 1, null, 0];
    }

    public function readCsv(string $path): array
    {
        $raw = file_get_contents($path);
        if (str_starts_with($raw, "\xFF\xFE")) $raw = mb_convert_encoding(substr($raw, 2), 'UTF-8', 'UTF-16LE');
        $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
        if (!mb_check_encoding($raw, 'UTF-8')) $raw = mb_convert_encoding($raw, 'UTF-8', 'Windows-1252');

        $firstLine = strtok($raw, "\n");
        $delims = [',' => substr_count($firstLine, ','), ';' => substr_count($firstLine, ';'), "\t" => substr_count($firstLine, "\t")];
        arsort($delims);
        $delim = array_key_first($delims);

        $rows = [];
        $fh = fopen('php://memory', 'r+');
        fwrite($fh, $raw);
        rewind($fh);
        while (($r = fgetcsv($fh, 0, $delim, '"', '')) !== false) $rows[] = $r;
        fclose($fh);
        return $rows;
    }

    public function readXlsx(string $path): array
    {
        if (!class_exists(ZipArchive::class)) {
            throw new RuntimeException('Máy chủ chưa hỗ trợ đọc .xlsx — hãy xuất file .csv từ máy POS.');
        }
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) throw new RuntimeException('Không mở được file .xlsx.');

        $shared = [];
        if (($xml = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
            foreach ($this->xml($xml)->si as $si) {
                $text = isset($si->t) ? (string) $si->t : '';
                foreach ($si->r ?? [] as $run) $text .= (string) $run->t;
                $shared[] = $text;
            }
        }

        $sheetPath = 'xl/worksheets/sheet1.xml';
        $wb = $zip->getFromName('xl/workbook.xml');
        $rels = $zip->getFromName('xl/_rels/workbook.xml.rels');
        if ($wb !== false && $rels !== false) {
            $first = $this->xml($wb)->sheets->sheet[0] ?? null;
            $rid = $first ? (string) $first->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'] : '';
            foreach ($this->xml($rels)->Relationship as $rel) {
                if ((string) $rel['Id'] === $rid) {
                    $target = ltrim((string) $rel['Target'], '/');
                    $sheetPath = str_starts_with($target, 'xl/') ? $target : 'xl/' . $target;
                }
            }
        }

        $sheet = $zip->getFromName($sheetPath);
        $zip->close();
        if ($sheet === false) throw new RuntimeException('File .xlsx không có trang tính nào.');

        $rows = [];
        foreach ($this->xml($sheet)->sheetData->row as $row) {
            $cells = [];
            foreach ($row->c as $c) {
                $col = $this->colIndex(preg_replace('/\d+/', '', (string) $c['r']));
                $type = (string) $c['t'];
                $val = match ($type) {
                    's'         => $shared[(int) $c->v] ?? '',
                    'inlineStr' => (string) ($c->is->t ?? ''),
                    default     => (string) $c->v,
                };
                $cells[$col] = $val;
            }
            if ($cells) {
                $max = max(array_keys($cells));
                $rows[] = array_replace(array_fill(0, $max + 1, ''), $cells);
            }
        }
        return $rows;
    }

    private function xml(string $s): SimpleXMLElement
    {
        $x = simplexml_load_string($s, SimpleXMLElement::class, LIBXML_NONET);
        if ($x === false) throw new RuntimeException('File .xlsx bị lỗi định dạng.');
        return $x;
    }

    private function colIndex(string $letters): int
    {
        $n = 0;
        foreach (str_split(strtoupper($letters)) as $ch) $n = $n * 26 + (ord($ch) - 64);
        return max(0, $n - 1);
    }
}
