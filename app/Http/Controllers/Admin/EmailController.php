<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\BulkEmail;
use App\Models\Customer;
use App\Models\EmailBlast;
use App\Models\EmailBlastRecipient;
use App\Models\EmailTemplate;
use App\Services\EmailBlastSender;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class EmailController extends Controller
{
    /** Số email gửi mỗi lần bấm/gọi — nhỏ để không timeout trên hosting chia sẻ. */
    private const CHUNK = 20;

    public function index()
    {
        $admin = Auth::user();

        // Khách có email hợp lệ — nguồn người nhận.
        $customers = Customer::with('user')
            ->get()
            ->filter(fn ($c) => filter_var($c->user?->email, FILTER_VALIDATE_EMAIL))
            ->map(fn ($c) => [
                'id'    => $c->id,
                'name'  => $c->user->name,
                'email' => $c->user->email,
                'phone' => $c->user->phone,
            ])
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();

        return view('admin.emails', [
            'emailData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'customers'  => $customers,
                'totalWithEmail' => count($customers),
                'templates'  => EmailTemplate::orderByDesc('id')->get()
                    ->map(fn ($t) => $this->presentTemplate($t))->all(),
                'blasts'     => EmailBlast::orderByDesc('id')->limit(50)->get()
                    ->map(fn ($b) => $this->presentBlast($b))->all(),
                'tokens'     => [
                    ['token' => '{name}',   'desc' => 'Tên khách hàng'],
                    ['token' => '{phone}',  'desc' => 'Số điện thoại'],
                    ['token' => '{points}', 'desc' => 'Điểm hiện có'],
                ],
                'urls' => [
                    'storeTemplate'   => route('admin.emails.templates.store'),
                    'updateTemplate'  => route('admin.emails.templates.update', ['template' => '__ID__']),
                    'destroyTemplate' => route('admin.emails.templates.destroy', ['template' => '__ID__']),
                    'createBlast'     => route('admin.emails.blasts.store'),
                    'sendChunk'       => route('admin.emails.blasts.send', ['blast' => '__ID__']),
                    'blastStatus'     => route('admin.emails.blasts.status', ['blast' => '__ID__']),
                    'destroyBlast'    => route('admin.emails.blasts.destroy', ['blast' => '__ID__']),
                    'test'            => route('admin.emails.test'),
                ],
            ],
        ]);
    }

    /* ─── Mẫu email ─── */

    public function storeTemplate(Request $request): JsonResponse
    {
        $data = $this->validateTemplate($request);
        $tpl = EmailTemplate::create($data);

        return response()->json(['template' => $this->presentTemplate($tpl)], 201);
    }

    public function updateTemplate(Request $request, EmailTemplate $template): JsonResponse
    {
        $template->update($this->validateTemplate($request));

        return response()->json(['template' => $this->presentTemplate($template->fresh())]);
    }

    public function destroyTemplate(EmailTemplate $template): JsonResponse
    {
        $template->delete();

        return response()->json(['message' => 'Đã xoá mẫu email']);
    }

    /* ─── Chiến dịch gửi email ─── */

    /** Tạo một lần gửi + chụp danh sách người nhận (chưa gửi email nào ở đây). */
    public function createBlast(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject'       => ['required', 'string', 'max:200'],
            'body'          => ['required', 'string', 'max:200000'],
            'attach_qr'     => ['boolean'],
            'audience'      => ['required', Rule::in(['all', 'selected'])],
            'customer_ids'  => ['array'],
            'customer_ids.*'=> ['integer'],
            'scheduled_at'  => ['nullable', 'date'],
        ], [
            'subject.required' => 'Vui lòng nhập tiêu đề email',
            'body.required'    => 'Vui lòng nhập nội dung email',
        ]);

        $body = HtmlSanitizer::clean($data['body']);
        if (!$body) {
            return response()->json(['message' => 'Nội dung email trống sau khi làm sạch.'], 422);
        }

        // Hẹn giờ: nhận giờ VN từ trình duyệt → quy về UTC để so & lưu.
        $scheduledAt = null;
        if (!empty($data['scheduled_at'])) {
            $scheduledAt = Carbon::parse($data['scheduled_at'], 'Asia/Ho_Chi_Minh')->utc();
            if ($scheduledAt->isPast()) {
                return response()->json(['message' => 'Thời gian hẹn gửi phải ở tương lai.'], 422);
            }
        }

        $query = Customer::with('user');
        if ($data['audience'] === 'selected') {
            $ids = $data['customer_ids'] ?? [];
            if (empty($ids)) {
                return response()->json(['message' => 'Vui lòng chọn ít nhất một khách hàng.'], 422);
            }
            $query->whereIn('id', $ids);
        }

        $recipients = $query->get()
            ->filter(fn ($c) => filter_var($c->user?->email, FILTER_VALIDATE_EMAIL))
            ->values();

        if ($recipients->isEmpty()) {
            return response()->json(['message' => 'Không có khách hàng nào có email hợp lệ.'], 422);
        }

        $blast = EmailBlast::create([
            'subject'      => $data['subject'],
            'body'         => $body,
            'attach_qr'    => (bool) ($data['attach_qr'] ?? false),
            'audience'     => $data['audience'],
            'total'        => $recipients->count(),
            // Có hẹn giờ → chờ cron gửi; không thì gửi ngay (frontend đẩy từng lô).
            'status'       => $scheduledAt ? 'scheduled' : 'sending',
            'scheduled_at' => $scheduledAt,
            'created_by'   => Auth::id(),
        ]);

        $now = now();
        $rows = $recipients->map(fn ($c) => [
            'email_blast_id' => $blast->id,
            'customer_id'    => $c->id,
            'name'           => $c->user->name,
            'email'          => $c->user->email,
            'status'         => 'pending',
            'created_at'     => $now,
            'updated_at'     => $now,
        ])->all();

        // Chèn theo lô để tránh câu lệnh quá lớn.
        foreach (array_chunk($rows, 500) as $batch) {
            EmailBlastRecipient::insert($batch);
        }

        return response()->json(['blast' => $this->presentBlast($blast->fresh())], 201);
    }

    /**
     * Gửi tiếp một lô (tối đa CHUNK) người nhận đang chờ. Frontend gọi lặp lại
     * cho tới khi done=true → progress bar. Cách này chạy đồng bộ theo từng lô
     * nhỏ nên không cần queue worker và không bị timeout.
     */
    public function sendChunk(EmailBlast $blast): JsonResponse
    {
        // Chưa tới giờ hẹn thì không gửi (để cron lo); chỉ trả tiến trình.
        if ($blast->status === 'scheduled') {
            return response()->json($this->progressPayload($blast, [
                'total' => $blast->total, 'sent' => 0, 'failed' => 0,
                'pending' => $blast->total, 'done' => false, 'status' => 'scheduled',
            ]));
        }

        $p = app(EmailBlastSender::class)->sendChunk($blast, self::CHUNK);

        return response()->json($this->progressPayload($blast->fresh(), $p));
    }

    /** Trạng thái hiện tại (để polling / mở lại chiến dịch còn dở). */
    public function blastStatus(EmailBlast $blast): JsonResponse
    {
        $p = ($blast->status === 'scheduled')
            ? ['total' => $blast->total, 'sent' => 0, 'failed' => 0, 'pending' => $blast->total, 'done' => false, 'status' => 'scheduled']
            : app(EmailBlastSender::class)->progress($blast);

        return response()->json($this->progressPayload($blast->fresh(), $p));
    }

    public function destroyBlast(EmailBlast $blast): JsonResponse
    {
        $blast->delete(); // recipients cascade

        return response()->json(['message' => 'Đã xoá lịch sử gửi']);
    }

    /** Gửi thử tới 1 địa chỉ (mặc định email admin) để xem trước. */
    public function test(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject'   => ['required', 'string', 'max:200'],
            'body'      => ['required', 'string', 'max:200000'],
            'attach_qr' => ['boolean'],
            'to'        => ['nullable', 'email'],
        ]);

        $to   = $data['to'] ?: Auth::user()->email;
        $body = HtmlSanitizer::clean($data['body']);
        if (!$to)   return response()->json(['message' => 'Không có địa chỉ nhận thử.'], 422);
        if (!$body) return response()->json(['message' => 'Nội dung email trống.'], 422);

        // Cá nhân hoá theo chính người test cho giống thật.
        $me = Auth::user();
        $vars = [
            '{name}' => $me->name, '{ten}' => $me->name,
            '{phone}' => $me->phone ?? '', '{sdt}' => $me->phone ?? '',
            '{points}' => '0', '{diem}' => '0',
        ];

        try {
            Mail::to($to)->send(new BulkEmail(
                strtr($data['subject'], $vars),
                strtr($body, $vars),
                (bool) ($data['attach_qr'] ?? false),
            ));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gửi thử thất bại: ' . $e->getMessage()], 422);
        }

        return response()->json(['message' => "Đã gửi email thử tới {$to}"]);
    }

    /* ─── Helpers ─── */

    /** Gói tiến trình + thông tin blast cho frontend. */
    private function progressPayload(EmailBlast $blast, array $p): array
    {
        return array_merge($p, [
            'id'    => $blast->id,
            'blast' => $this->presentBlast($blast),
        ]);
    }

    private function validateTemplate(Request $request): array
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:150'],
            'subject'   => ['required', 'string', 'max:200'],
            'body'      => ['nullable', 'string', 'max:200000'],
            'attach_qr' => ['boolean'],
        ], [
            'name.required'    => 'Vui lòng nhập tên mẫu',
            'subject.required' => 'Vui lòng nhập tiêu đề',
        ]);

        return [
            'name'      => $data['name'],
            'subject'   => $data['subject'],
            'body'      => HtmlSanitizer::clean($data['body'] ?? null),
            'attach_qr' => (bool) ($data['attach_qr'] ?? false),
        ];
    }

    private function presentTemplate(EmailTemplate $t): array
    {
        return [
            'id'        => $t->id,
            'name'      => $t->name,
            'subject'   => $t->subject,
            'body'      => $t->body ?? '',
            'attach_qr' => (bool) $t->attach_qr,
        ];
    }

    private function presentBlast(EmailBlast $b): array
    {
        return [
            'id'          => $b->id,
            'subject'     => $b->subject,
            'audience'    => $b->audience,
            'attach_qr'   => (bool) $b->attach_qr,
            'total'       => $b->total,
            'sent'        => $b->sent_count,
            'failed'      => $b->failed_count,
            'pending'     => max(0, $b->total - $b->sent_count - $b->failed_count),
            'status'      => $b->status,
            'scheduled_at'=> $b->scheduled_at?->setTimezone('Asia/Ho_Chi_Minh')->format('H:i d/m/Y'),
            'created_at'  => $b->created_at?->setTimezone('Asia/Ho_Chi_Minh')->format('H:i d/m/Y'),
        ];
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last  = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
