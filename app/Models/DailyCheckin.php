<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyCheckin extends Model {
    protected $fillable = ['customer_id', 'checkin_date', 'streak', 'points_awarded'];
    protected function casts(): array { return ['checkin_date' => 'date']; }
}
