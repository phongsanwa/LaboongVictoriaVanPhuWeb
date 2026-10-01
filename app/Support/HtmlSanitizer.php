<?php

namespace App\Support;

/**
 * Làm sạch HTML do trình soạn thảo (TinyMCE) tạo bằng danh sách-cho-phép (allowlist).
 * Chống Stored XSS: gỡ mọi thẻ/thuộc tính lạ, thuộc tính sự kiện on*, URL nguy hiểm
 * (javascript:, data:… trừ ảnh data an toàn), iframe không phải YouTube.
 *
 * Dùng chung cho Tin tức và các nội dung HTML khác lưu qua admin.
 */
class HtmlSanitizer
{
    private const ALLOWED_TAGS = [
        'p', 'br', 'hr', 'span', 'div',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'mark', 'small',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
        'a', 'img', 'figure', 'figcaption',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
        'iframe', 'video', 'source',
    ];

    /** Thuộc tính được phép, theo từng thẻ ('*' = áp dụng cho mọi thẻ). */
    private const ALLOWED_ATTRS = [
        '*'      => ['style', 'class', 'title'],
        'a'      => ['href', 'target', 'rel'],
        'img'    => ['src', 'alt', 'width', 'height'],
        'iframe' => ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
        'video'  => ['src', 'controls', 'width', 'height', 'poster'],
        'source' => ['src', 'type'],
        'td'     => ['colspan', 'rowspan'],
        'th'     => ['colspan', 'rowspan', 'scope'],
        'col'    => ['span'],
        'colgroup' => ['span'],
    ];

    public static function clean(?string $html): ?string
    {
        if ($html === null || trim($html) === '') return null;

        $dom = new \DOMDocument();
        $prev = libxml_use_internal_errors(true);
        // Bọc trong wrapper + ép UTF-8 để DOMDocument không hiểu sai ký tự tiếng Việt.
        $wrapped = '<?xml encoding="UTF-8"><div id="__laboong_root__">' . $html . '</div>';
        $dom->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($prev);

        $root = $dom->getElementById('__laboong_root__');
        if (!$root) return null;

        self::cleanNode($root);

        $out = '';
        foreach (iterator_to_array($root->childNodes) as $child) {
            $out .= $dom->saveHTML($child);
        }

        $out = trim($out);
        return $out === '' ? null : $out;
    }

    /** Duyệt đệ quy: gỡ thẻ/thuộc tính không hợp lệ. */
    private static function cleanNode(\DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof \DOMElement) {
                $tag = strtolower($child->nodeName);

                if (!in_array($tag, self::ALLOWED_TAGS, true)) {
                    self::cleanNode($child);
                    $unsafe = in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math'], true);
                    if (!$unsafe) {
                        while ($child->firstChild) {
                            $node->insertBefore($child->firstChild, $child);
                        }
                    }
                    $node->removeChild($child);
                    continue;
                }

                self::cleanElementAttributes($child, $tag);
                self::cleanNode($child);
            } elseif ($child instanceof \DOMComment) {
                $node->removeChild($child);
            }
        }
    }

    /** Lọc thuộc tính của một phần tử theo allowlist + kiểm tra URL an toàn. */
    private static function cleanElementAttributes(\DOMElement $el, string $tag): void
    {
        $allowed = array_merge(self::ALLOWED_ATTRS['*'], self::ALLOWED_ATTRS[$tag] ?? []);

        foreach (iterator_to_array($el->attributes) as $attr) {
            $name = strtolower($attr->nodeName);
            $value = $attr->nodeValue;

            if (str_starts_with($name, 'on') || !in_array($name, $allowed, true)) {
                $el->removeAttribute($attr->nodeName);
                continue;
            }

            if (in_array($name, ['href', 'src', 'poster'], true) && !self::isSafeUrl($value)) {
                $el->removeAttribute($attr->nodeName);
                continue;
            }

            if ($name === 'style' && preg_match('~expression\s*\(|url\s*\(\s*[\'"]?\s*(javascript|data):~i', $value)) {
                $el->removeAttribute($attr->nodeName);
            }
        }

        // iframe chỉ cho phép nhúng YouTube.
        if ($tag === 'iframe') {
            $src = $el->getAttribute('src');
            if (!preg_match('~^https://(www\.)?(youtube(-nocookie)?\.com|youtu\.be)/~i', $src)) {
                $el->parentNode?->removeChild($el);
                return;
            }
        }

        if ($tag === 'a' && strtolower($el->getAttribute('target')) === '_blank') {
            $el->setAttribute('rel', 'noopener noreferrer');
        }
    }

    /** URL an toàn: http/https, mailto/tel, đường dẫn tương đối, hoặc ảnh data URI. */
    private static function isSafeUrl(?string $url): bool
    {
        $url = trim((string) $url);
        if ($url === '') return false;

        $probe = strtolower(preg_replace('~[\s\x00-\x20]+~', '', $url));

        if (str_starts_with($probe, 'javascript:') || str_starts_with($probe, 'vbscript:')) {
            return false;
        }
        if (str_starts_with($probe, 'data:')) {
            return (bool) preg_match('~^data:image/(png|jpe?g|gif|webp|bmp);base64,~i', $url);
        }

        return true;
    }
}
