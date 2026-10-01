<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
@include('partials.favicon')
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{{ $article->seo_title ?: $article->title }} — Laboong Victoria Văn Phú</title>
@include('partials.seo', [
    'seoTitle' => $article->seo_title ?: $article->title,
    'seoDesc'  => $article->seo_description ?: ($article->excerpt ?: 'Tin tức từ Laboong Victoria Văn Phú.'),
    'seoImage' => $article->image_url ?: null,
])
<script type="application/ld+json">
{!! json_encode(array_filter([
    '@context'      => 'https://schema.org',
    '@type'         => 'NewsArticle',
    'headline'      => $article->title,
    'description'   => $article->seo_description ?: $article->excerpt,
    'image'         => $article->image_url ? url($article->image_url) : null,
    'datePublished' => $article->published_at?->toIso8601String(),
    'dateModified'  => $article->updated_at?->toIso8601String(),
    'author'        => ['@type' => 'Organization', 'name' => 'Laboong Victoria Văn Phú'],
    'publisher'     => ['@type' => 'Organization', 'name' => 'Laboong Victoria Văn Phú'],
    'mainEntityOfPage' => url()->current(),
], fn ($v) => $v !== null), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !!}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Be Vietnam Pro', sans-serif; color: #1A1A1A; background: #F4F6F3; }
  .hdr { background: linear-gradient(150deg, #0F623F, #1AA86A); padding: 14px 20px; }
  .hdr-in { max-width: 760px; margin: 0 auto; display: flex; align-items: center; gap: 10px; }
  .hdr .mark { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,.2); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; }
  .hdr .nm { color: #fff; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 17px; line-height: 1.1; }
  .hdr .sub { color: rgba(255,255,255,.75); font-size: 11px; }
  .hdr a.cta { margin-left: auto; color: #fff; text-decoration: none; font-size: 13px; font-weight: 700; background: rgba(255,255,255,.18); padding: 8px 16px; border-radius: 999px; }
  main { max-width: 760px; margin: 0 auto; padding: 28px 20px 60px; }
  .card { background: #fff; border-radius: 18px; padding: 30px 32px; box-shadow: 0 4px 24px rgba(0,0,0,.06); }
  h1 { font-size: 26px; font-weight: 800; line-height: 1.3; margin-bottom: 8px; }
  .meta { font-size: 12.5px; color: #6B7280; margin-bottom: 18px; }
  .cover { width: 100%; border-radius: 14px; margin-bottom: 20px; display: block; }
  .yt { position: relative; width: 100%; padding-top: 56.25%; border-radius: 14px; overflow: hidden; margin-bottom: 20px; }
  .yt iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .body { font-size: 15.5px; line-height: 1.75; color: #27272A; overflow-wrap: break-word; }
  .body img { max-width: 100%; height: auto; border-radius: 10px; }
  .body h2 { font-size: 20px; margin: 20px 0 8px; }
  .body h3 { font-size: 17px; margin: 16px 0 8px; }
  .body p { margin-bottom: 12px; }
  .body ul, .body ol { margin: 0 0 12px 22px; }
  .body table { border-collapse: collapse; max-width: 100%; overflow-x: auto; display: block; }
  .body blockquote { border-left: 3px solid #1AA86A; padding-left: 14px; color: #4B5563; margin-bottom: 12px; }
  .others { margin-top: 26px; }
  .others h2 { font-size: 17px; font-weight: 800; margin-bottom: 12px; }
  .others a { display: block; background: #fff; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; text-decoration: none; color: #1A1A1A; font-weight: 600; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,.04); }
  .others a span { display: block; font-size: 12px; color: #6B7280; font-weight: 400; margin-top: 2px; }
  @media (max-width: 560px) { .card { padding: 22px 18px; } h1 { font-size: 21px; } }
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
    <article class="card">
      <h1>{{ $article->title }}</h1>
      <div class="meta">
        Laboong Victoria Văn Phú
        @if ($article->published_at) · {{ $article->published_at->format('d/m/Y') }} @endif
      </div>

      @if ($article->media_type === 'youtube' && ($yt = \App\Models\NewsArticle::youtubeId($article->youtube_url)))
        <div class="yt"><iframe src="https://www.youtube.com/embed/{{ $yt }}" allowfullscreen loading="lazy" title="{{ $article->title }}"></iframe></div>
      @elseif ($article->media_type === 'video' && $article->video_url)
        <video class="cover" src="{{ $article->video_url }}" controls @if($article->image_url) poster="{{ $article->image_url }}" @endif></video>
      @elseif ($article->image_url)
        <img class="cover" src="{{ $article->image_url }}" alt="{{ $article->title }}" />
      @endif

      @if ($article->excerpt)
        <p style="font-weight:600;color:#374151;margin-bottom:14px;">{{ $article->excerpt }}</p>
      @endif

      <div class="body">{!! $article->body !!}</div>
    </article>

    @if ($others->isNotEmpty())
      <section class="others">
        <h2>Tin khác từ Laboong</h2>
        @foreach ($others as $o)
          <a href="{{ route('news.show', $o->slug) }}">
            {{ $o->title }}
            @if ($o->excerpt)<span>{{ \Illuminate\Support\Str::limit($o->excerpt, 90) }}</span>@endif
          </a>
        @endforeach
      </section>
    @endif
  </main>
</body>
</html>
