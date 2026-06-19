<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderPlaced extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Order $order) {}

    public function envelope(): Envelope
    {
        $id = 'LB-' . str_pad($this->order->id, 4, '0', STR_PAD_LEFT);

        return new Envelope(subject: "🧋 Đơn hàng mới #{$id} — Laboong Victoria Văn Phú");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.order-placed');
    }
}
