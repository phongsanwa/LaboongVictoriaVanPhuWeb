<?php

namespace App\Mail;

use App\Support\Site;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;

/**
 * Email gửi hàng loạt cho khách (chiến dịch email trong admin).
 * $subject và $bodyHtml đã được cá nhân hoá sẵn (thay {name}, {points}…)
 * trước khi khởi tạo mailable.
 */
class BulkEmail extends Mailable
{
    public function __construct(
        public readonly string $subjectLine,
        public readonly string $bodyHtml,
        public readonly bool $attachQr = false,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function headers(): Headers
    {
        return new Headers(
            text: [
                'X-Mailer'                 => 'Laboong Mailer',
                'Auto-Submitted'           => 'auto-generated',
                'X-Auto-Response-Suppress' => 'OOF, AutoReply',
                'Precedence'               => 'bulk',
            ],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.bulk', with: [
            'bodyHtml' => $this->bodyHtml,
            'siteUrl'  => Site::base(),
            'attachQr' => $this->attachQr,
        ]);
    }
}
