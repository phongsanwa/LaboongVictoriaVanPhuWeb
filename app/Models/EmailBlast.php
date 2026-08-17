<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailBlast extends Model
{
    protected $fillable = [
        'subject', 'body', 'audience', 'total',
        'sent_count', 'failed_count', 'status', 'created_by',
    ];

    public function recipients(): HasMany
    {
        return $this->hasMany(EmailBlastRecipient::class);
    }

    public function pendingRecipients(): HasMany
    {
        return $this->recipients()->where('status', 'pending');
    }
}
