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

    /** Loại bỏ script/handler nguy hiểm khỏi HTML do TinyMCE tạo. */
    private function sanitizeBody(?string $html): ?string
    {
        if ($html === null || trim($html) === '') return null;

        // Bỏ toàn bộ <script>…</script> và thuộc tính sự kiện on*="" / javascript:
        $html = preg_replace('~<script\b[^>]*>.*?</script>~is', '', $html);
        $html = preg_replace('~\son\w+\s*=\s*"[^"]*"~i', '', $html);
        $html = preg_replace("~\son\w+\s*=\s*'[^']*'~i", '', $html);
        $html = preg_replace('~javascript:~i', '', $html);

        return $html;
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
