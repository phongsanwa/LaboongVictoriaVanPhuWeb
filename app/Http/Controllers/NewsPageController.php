<?php

namespace App\Http\Controllers;

use App\Models\NewsArticle;

/** Trang tin tức CÔNG KHAI (không cần đăng nhập) — để Google index được bài viết. */
class NewsPageController extends Controller
{
    public function index()
    {
        $articles = NewsArticle::where('status', 'active')
            ->orderByDesc('published_at')->orderByDesc('id')
            ->paginate(12);

        return view('news-list', ['articles' => $articles]);
    }

    public function show(string $slug)
    {
        $article = NewsArticle::where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $others = NewsArticle::where('status', 'active')
            ->where('id', '!=', $article->id)
            ->orderByDesc('published_at')->orderByDesc('id')
            ->limit(4)
            ->get();

        return view('news-article', ['article' => $article, 'others' => $others]);
    }
}
