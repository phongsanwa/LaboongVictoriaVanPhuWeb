@php
  $o     = $order;
  $ordNo = 'LB-' . str_pad($o->id, 4, '0', STR_PAD_LEFT);
  $user  = $o->customer?->user;
  $name  = $user?->name  ?? 'Khach hang';
  $phone = $user?->phone ?? '—';
  $items = $o->items;

  $sub   = (int) $o->subtotal;
  $disc  = (int) $o->discount_amount;
  $total = (int) $o->total_amount;
  $pts   = (int) $o->points_earned;
  $created = $o->created_at->setTimezone('Asia/Ho_Chi_Minh')->format('H:i d/m/Y');

  $fmt = fn(int $n): string => number_format($n, 0, ',', '.');
@endphp
================================================
DON HANG MOI - LABOONG VICTORIA VAN PHU
================================================
Ma don : {{ $ordNo }}
Thoi gian: {{ $created }}

KHACH HANG
----------
Ten      : {{ $name }}
SDT      : {{ $phone }}
Hinh thuc: Nhan tai quay

MON DAT
-------
@foreach ($items as $item)
@php
  $parts = [];
  if ($item->size_name)           $parts[] = "Size {$item->size_name}";
  if ($item->sugar_level !== null) $parts[] = "Duong {$item->sugar_level}%";
  if ($item->ice_level   !== null) $parts[] = "Da {$item->ice_level}%";
  foreach ($item->toppings as $t) $parts[] = $t->topping_name;
@endphp
{{ $item->quantity }}x {{ $item->product?->name ?? "San pham #{$item->product_id}" }}
@if (count($parts))
   {{ implode(' / ', $parts) }}
@endif
   {{ $fmt((int)($item->unit_price * $item->quantity)) }}d

@endforeach
@if ($o->note)
GHI CHU: {{ $o->note }}

@endif
TONG TIEN
---------
Tam tinh : {{ $fmt($sub) }}d
@if ($disc > 0)
Giam gia : -{{ $fmt($disc) }}d
@endif
Tong cong: {{ $fmt($total) }}d
@if ($pts > 0)
Diem tich: +{{ $pts }} diem
@endif

Xem va xu ly don hang tai:
{{ url('/admin/orders') }}

================================================
Email nay duoc gui tu dong boi he thong Laboong.
Vui long khong tra loi email nay.
