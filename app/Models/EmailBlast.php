<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailBlast extends Model
{
    protected $fillable = [
        'subject', 'body', 'attach_qr', 'audience', 'total',
        'sent_count', 'failed_count', 'status', 'scheduled_at', 'created_by',
    ];

    protected function casts(): array
    {
        return ['attach_qr' => 'boolean', 'scheduled_at' => 'datetime'];
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(EmailBlastRecipient::class);
    }

    public function pendingRecipients(): HasMany
    {
        return $this->recipients()->where('status', 'pending');
    }
}
