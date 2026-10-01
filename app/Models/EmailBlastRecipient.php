<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailBlastRecipient extends Model
{
    protected $fillable = [
        'email_blast_id', 'customer_id', 'name', 'email',
        'status', 'error', 'sent_at',
    ];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime'];
    }

    public function blast(): BelongsTo
    {
        return $this->belongsTo(EmailBlast::class, 'email_blast_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
