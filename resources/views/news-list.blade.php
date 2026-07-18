<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
@include('partials.favicon')
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Tin tức & Ưu đãi — Laboong Victoria Văn Phú</title>
@include('partials.seo', [
    'seoTitle' => 'Tin tức & Ưu đãi — Laboong Victoria Văn Phú',
    'seoDesc'  => 'Tin tức, chương trình khuyến mãi và món mới từ Laboong Victoria Văn Phú, Hà Đông, Hà Nội.',
])
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Be Vietnam Pro', sans-serif; color: #1A1A1A; background: #F4F6F3; }
  .hdr { background: linear-gradient(150deg, #0F623F, #1AA86A); padding: 14px 20px; }
  .hdr-in { max-width: 860px; margin: 0 auto; display: flex; align-items: center; gap: 10px; }
  .hdr .mark { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,.2); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; }
  .hdr .nm { color: #fff; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 17px; line-height: 1.1; }
  .hdr .sub { color: rgba(255,255,255,.75); font-size: 11px; }
  .hdr a.cta { margin-left: auto; color: #fff; text-decoration: none; font-size: 13px; font-weight: 700; background: rgba(255,255,255,.18); padding: 8px 16px; border-radius: 999px; }
  main { max-width: 860px; margin: 0 auto; padding: 28px 20px 60px; }
  h1 { font-size: 24px; font-weight: 800; margin-bottom: 18px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
  .item { background: #fff; border-radius: 16px; overflow: hidden; text-decoration: none; color: #1A1A1A; box-shadow: 0 2px 12px rgba(0,0,0,.05); display: flex; flex-direction: column; transition: transform .14s ease; }
  .item:hover { transform: translateY(-2px); }
  .thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: linear-gradient(150deg,#0F623F,#1AA86A); }
  .item .b { padding: 14px 16px; }
  .item h2 { font-size: 15px; font-weight: 700; line-height: 1.4; margin-bottom: 4px; }
  .item p { font-size: 12.5px; color: #6B7280; line-height: 1.5; }
  .item .d { font-size: 11.5px; color: #9CA3AF; margin-top: 8px; }
  .pager { margin-top: 22px; display: flex; gap: 8px; justify-content: center; }
  .pager a, .pager span { padding: 8px 14px; border-radius: 9px; background: #fff; text-decoration: none; color: #0F623F; font-weight: 700; font-size: 13.5px; }
  .pager span.cur { background: #0F623F; color: #fff; }
  .empty { background: #fff; border-radius: 16px; padding: 40px; text-align: center; color: #6B7280; }
</style>
</head>
<body>
  <header class="hdr">
    <div class="hdr-in">
      <div class="mark">L</div>
      <div><div class="nm">Laboong</div><div class="sub">Victoria Văn Phú</div></div>
      <a class="cta" href="{{ url('/') }}">Đặt món ngay →</a>
    </div>
  </header>

  <main>
    <h1>Tin tức & Ưu đãi 🧋</h1>

    @if ($articles->isEmpty())
      <div class="empty">Chưa có tin tức nào — quay lại sau nhé!</div>
    @else
      <div class="grid">
        @foreach ($articles as $a)
          <a class="item" href="{{ route('news.show', $a->slug) }}">
            @php $thumb = $a->image_url ?: (\App\Models\NewsArticle::youtubeId($a->youtube_url) ? 'https://img.youtube.com/vi/' . \App\Models\NewsArticle::youtubeId($a->youtube_url) . '/hqdefault.jpg' : null); @endphp
            @if ($thumb)
              <img class="thumb" src="{{ $thumb }}" alt="{{ $a->title }}" loading="lazy" />
            @else
              <div class="thumb"></div>
            @endif
            <div class="b">
              <h2>{{ $a->title }}</h2>
              @if ($a->excerpt)<p>{{ \Illuminate\Support\Str::limit($a->excerpt, 100) }}</p>@endif
              @if ($a->published_at)<div class="d">{{ $a->published_at->format('d/m/Y') }}</div>@endif
            </div>
          </a>
        @endforeach
      </div>
      <div class="pager">{{ $articles->links('pagination::simple-default') }}</div>
    @endif
  </main>
</body>
</html>
