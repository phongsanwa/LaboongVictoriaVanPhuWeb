<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;

class WelcomeRegistered extends Mailable
{
    /** Địa chỉ website chính hiển thị & mã QR trong email. */
    public const SITE_URL = 'https://laboongtoanhav3victoriavanphu.com/';

    public function __construct(
        public readonly User $user,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '[Laboong] Bạn đã đăng ký thành công 🎉');
    }

    public function headers(): Headers
    {
        return new Headers(
            messageId: 'welcome-' . $this->user->id . '-' . time() . '@' . parse_url(config('app.url'), PHP_URL_HOST),
            text: [
                'X-Mailer'                 => 'Laboong Auth System',
                'Auto-Submitted'           => 'auto-generated',
                'X-Auto-Response-Suppress' => 'OOF, AutoReply',
            ],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.welcome-registered', with: [
            'name'    => $this->user->name,
            'siteUrl' => self::SITE_URL,
        ]);
    }
}
