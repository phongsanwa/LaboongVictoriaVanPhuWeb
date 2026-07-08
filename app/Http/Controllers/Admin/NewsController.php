<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class NewsController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        return view('admin.news', [
            'newsData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'news' => NewsArticle::orderBy('sort_order')->orderByDesc('id')
                    ->get()->map(fn (NewsArticle $n) => $this->present($n))->all(),
                'urls' => [
                    'store'   => route('admin.news.store'),
                    'update'  => route('admin.news.update', ['news' => '__ID__']),
                    'toggle'  => route('admin.news.toggle', ['news' => '__ID__']),
                    'destroy' => route('admin.news.destroy', ['news' => '__ID__']),
                    'upload'  => route('admin.news.upload'),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $news = NewsArticle::create(array_merge($data, [
            'slug'         => $this->uniqueSlug($data['title']),
            'sort_order'   => (NewsArticle::max('sort_order') ?? 0) + 1,
            'published_at' => $data['status'] === 'active' ? now() : null,
        ]));

        return response()->json(['news' => $this->present($news)], 201);
    }

    public function update(Request $request, NewsArticle $news): JsonResponse
    {
        $data = $this->validated($request);

        // Đặt published_at lần đầu khi chuyển sang active
        if ($data['status'] === 'active' && !$news->published_at) {
            $data['published_at'] = now();
        }

        $news->update($data);

        return response()->json(['news' => $this->present($news->fresh())]);
    }

    public function toggle(NewsArticle $news): JsonResponse
    {
        $news->status = $news->status === 'active' ? 'inactive' : 'active';
        if ($news->status === 'active' && !$news->published_at) {
            $news->published_at = now();
        }
        $news->save();

        return response()->json(['news' => $this->present($news)]);
    }

    public function destroy(NewsArticle $news): JsonResponse
    {
        foreach ([$news->image_url, $news->video_url] as $url) {
            $this->deleteStored($url);
        }
        $news->delete();

        return response()->json(['message' => 'Đã xoá tin tức']);
    }

    /** Upload ảnh (max 4MB) hoặc video (max 60MB) — trả về URL công khai. */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'kind' => ['required', Rule::in(['image', 'video'])],
            'file' => ['required', 'file', 'max:61440'],
        ]);

        $file = $request->file('file');
        $kind = $request->input('kind');

        if ($kind === 'image') {
            $request->validate(['file' => ['image', 'mimes:jpg,jpeg,png,webp,gif', 'max:4096']]);
            $path = Storage::disk('public')->put('news/images', $file);
        } else {
            $request->validate(['file' => ['mimetypes:video/mp4,video/webm,video/quicktime', 'max:61440']]);
            $path = Storage::disk('public')->put('news/videos', $file);
        }

        return response()->json(['url' => Storage::url($path)]);
    }

    /* ─── Helpers ─── */

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:200'],
            'excerpt'     => ['nullable', 'string', 'max:500'],
            'body'        => ['nullable', 'string', 'max:200000'],
            'media_type'  => ['required', Rule::in(['image', 'video', 'youtube'])],
            'image_url'   => ['nullable', 'string', 'max:500'],
            'video_url'   => ['nullable', 'string', 'max:500'],
            'youtube_url' => ['nullable', 'string', 'max:500'],
            'status'      => ['required', Rule::in(['active', 'inactive'])],
        ]);

        // Kiểm tra media theo loại
        if ($data['media_type'] === 'youtube') {
            if (!NewsArticle::youtubeId($data['youtube_url'] ?? null)) {
                abort(response()->json(['message' => 'Link YouTube không hợp lệ'], 422));
            }
        } elseif ($data['media_type'] === 'video') {
            if (empty($data['video_url'])) {
                abort(response()->json(['message' => 'Vui lòng tải video lên'], 422));
            }
        }

        return [
            'title'       => $data['title'],
            'excerpt'     => $data['excerpt'] ?? null,
            'body'        => $this->sanitizeBody($data['body'] ?? null),
            'media_type'  => $data['media_type'],
            'image_url'   => $data['image_url'] ?? null,
            'video_url'   => $data['media_type'] === 'video' ? ($data['video_url'] ?? null) : null,
            'youtube_url' => $data['media_type'] === 'youtube' ? ($data['youtube_url'] ?? null) : null,
            'status'      => $data['status'],
        ];
    }

    private function present(NewsArticle $n): array
    {
        return [
            'id'          => $n->id,
            'title'       => $n->title,
            'excerpt'     => $n->excerpt ?? '',
            'body'        => $n->body ?? '',
            'media_type'  => $n->media_type,
            'image_url'   => $n->image_url,
            'video_url'   => $n->video_url,
            'youtube_url' => $n->youtube_url,
            'youtube_id'  => NewsArticle::youtubeId($n->youtube_url),
            'status'      => $n->status,
            'published_at'=> $n->published_at?->format('d/m/Y'),
        ];
    }

    /* ─── Làm sạch HTML (danh sách cho phép, dựa trên DOM) ─── */

    /** Thẻ được phép giữ lại. Thẻ ngoài danh sách bị gỡ (giữ lại nội dung text bên trong). */
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

    /**
     * Làm sạch HTML do TinyMCE tạo bằng danh sách-cho-phép (allowlist).
     * Chống Stored XSS: gỡ mọi thẻ/thuộc tính lạ, thuộc tính sự kiện on*,
     * và URL nguy hiểm (javascript:, data:… trừ ảnh data an toàn).
     */
    private function sanitizeBody(?string $html): ?string
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

        $this->cleanNode($root);

        // Ghép lại nội dung bên trong wrapper.
        $out = '';
        foreach (iterator_to_array($root->childNodes) as $child) {
            $out .= $dom->saveHTML($child);
        }

        $out = trim($out);
        return $out === '' ? null : $out;
    }

    /** Duyệt đệ quy: gỡ thẻ/thuộc tính không hợp lệ. */
    private function cleanNode(\DOMNode $node): void
    {
        // Duyệt trên bản sao danh sách con vì ta sẽ thay đổi cây trong lúc lặp.
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof \DOMElement) {
                $tag = strtolower($child->nodeName);

                if (!in_array($tag, self::ALLOWED_TAGS, true)) {
                    // Thẻ không cho phép (script, style, object, svg, …):
                    // đưa các node con hợp lệ ra ngoài rồi xoá thẻ này.
                    $this->cleanNode($child);
                    $unsafe = in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math'], true);
                    if (!$unsafe) {
                        while ($child->firstChild) {
                            $node->insertBefore($child->firstChild, $child);
                        }
                    }
                    $node->removeChild($child);
                    continue;
                }

                $this->cleanElementAttributes($child, $tag);
                $this->cleanNode($child);
            } elseif ($child instanceof \DOMComment) {
                // Bỏ chú thích (có thể chứa conditional comment độc hại).
                $node->removeChild($child);
            }
        }
    }

    /** Lọc thuộc tính của một phần tử theo allowlist + kiểm tra URL an toàn. */
    private function cleanElementAttributes(\DOMElement $el, string $tag): void
    {
        $allowed = array_merge(self::ALLOWED_ATTRS['*'], self::ALLOWED_ATTRS[$tag] ?? []);

        foreach (iterator_to_array($el->attributes) as $attr) {
            $name = strtolower($attr->nodeName);
            $value = $attr->nodeValue;

            // Gỡ mọi handler sự kiện và thuộc tính ngoài allowlist.
            if (str_starts_with($name, 'on') || !in_array($name, $allowed, true)) {
                $el->removeAttribute($attr->nodeName);
                continue;
            }

            // Kiểm tra URL trên các thuộc tính chứa liên kết.
            if (in_array($name, ['href', 'src', 'poster'], true) && !$this->isSafeUrl($value)) {
                $el->removeAttribute($attr->nodeName);
                continue;
            }

            // Chặn CSS nguy hiểm trong style (url(javascript:…), expression()).
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

        // Bắt buộc rel an toàn cho link mở tab mới.
        if ($tag === 'a' && strtolower($el->getAttribute('target')) === '_blank') {
            $el->setAttribute('rel', 'noopener noreferrer');
        }
    }

    /** URL an toàn: http/https, mailto/tel, đường dẫn tương đối, hoặc ảnh data URI. */
    private function isSafeUrl(?string $url): bool
    {
        $url = trim((string) $url);
        if ($url === '') return false;

        // Loại bỏ ký tự điều khiển/khoảng trắng có thể dùng để né bộ lọc (vd "java\tscript:").
        $probe = strtolower(preg_replace('~[\s\x00-\x20]+~', '', $url));

        if (str_starts_with($probe, 'javascript:') || str_starts_with($probe, 'vbscript:')) {
            return false;
        }
        // Cho phép ảnh data URI an toàn, chặn data URI khác (vd data:text/html).
        if (str_starts_with($probe, 'data:')) {
            return (bool) preg_match('~^data:image/(png|jpe?g|gif|webp|bmp);base64,~i', $url);
        }

        return true;
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'tin-tuc';
        $slug = $base; $i = 1;
        while (NewsArticle::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }

    private function deleteStored(?string $url): void
    {
        if ($url && str_starts_with($url, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $url));
        }
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';
        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
