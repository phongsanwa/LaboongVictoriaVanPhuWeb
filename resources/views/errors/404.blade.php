<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
@include('partials.favicon')
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>404 · Không tìm thấy trang — Laboong</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: 'Be Vietnam Pro', sans-serif; color: #1A1A1A;
    background: linear-gradient(160deg, #0F623F 0%, #1AA86A 100%);
    padding: 24px;
  }
  .card {
    background: #fff; border-radius: 24px; padding: 48px 40px; max-width: 480px; width: 100%;
    text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,.25);
  }
  .brand { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 26px; }
  .brand .mark {
    width: 42px; height: 42px; border-radius: 12px; color: #fff;
    background: linear-gradient(150deg, #0F623F, #1AA86A);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Baloo 2', cursive; font-size: 22px; font-weight: 800;
  }
  .brand .txt { text-align: left; }
  .brand .nm { font-family: 'Baloo 2', cursive; font-size: 18px; font-weight: 800; color: #0F623F; line-height: 1.1; }
  .brand .sub { font-size: 11.5px; color: #6B7280; }
  .cup { font-size: 56px; line-height: 1; margin-bottom: 6px; }
  .code {
    font-family: 'Baloo 2', cursive; font-size: 84px; font-weight: 800; line-height: 1;
    background: linear-gradient(150deg, #0F623F, #1AA86A);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  h1 { font-size: 20px; font-weight: 800; margin: 10px 0 8px; }
  p { font-size: 14px; color: #6B7280; line-height: 1.65; margin-bottom: 26px; }
  .acts { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .btn {
    display: inline-flex; align-items: center; gap: 7px; padding: 12px 24px; border-radius: 12px;
    font-family: inherit; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer;
    border: none; transition: transform .12s ease, box-shadow .12s ease;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn.primary { color: #fff; background: linear-gradient(150deg, #0F623F, #1AA86A); box-shadow: 0 6px 16px rgba(15,98,63,.3); }
  .btn.ghost { color: #0F623F; background: #F0FDF4; border: 1.5px solid #BBF7D0; }
  @media (max-width: 480px) {
    .card { padding: 36px 22px; }
    .code { font-size: 64px; }
  }
</style>
</head>
<body>
  <main class="card">
    <div class="brand">
      <div class="mark">L</div>
      <div class="txt">
        <div class="nm">Laboong</div>
        <div class="sub">Victoria Văn Phú</div>
      </div>
    </div>
    <div class="cup">🧋</div>
    <div class="code">404</div>
    <h1>Không tìm thấy trang này</h1>
    <p>Trang bạn tìm có thể đã bị đổi tên, xoá đi, hoặc chưa từng tồn tại.<br/>Quay về trang chủ và gọi một ly trà sữa nhé!</p>
    <div class="acts">
      <a class="btn primary" href="{{ url('/') }}">← Về trang chủ</a>
      <a class="btn ghost" href="{{ url('/menu') }}">Xem thực đơn</a>
    </div>
  </main>
</body>
</html>
