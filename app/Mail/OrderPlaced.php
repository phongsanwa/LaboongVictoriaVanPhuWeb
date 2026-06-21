<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class OrderPlaced extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Order $order) {}

    public function envelope(): Envelope
    {
        $id = 'LB-' . str_pad($this->order->id, 4, '0', STR_PAD_LEFT);

        return new Envelope(subject: "[Don hang moi] #{$id} - Laboong Victoria Van Phu");
    }

    public function headers(): Headers
    {
        return new Headers(
            messageId: 'order-' . $this->order->id . '-' . time() . '@' . parse_url(config('app.url'), PHP_URL_HOST),
            references: [],
            text: [
                'X-Mailer'        => 'Laboong Order System',
                'Precedence'      => 'bulk',
                'Auto-Submitted'  => 'auto-generated',
                'X-Auto-Response-Suppress' => 'OOF, AutoReply',
            ],
        );
    }

    public function content(): Content
    {
        return new Content(
            view:     'emails.order-placed',
            text:     'emails.order-placed-text',
        );
    }
}
