<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $table = 'roles';
    // Định nghĩa hằng số 5 Roles để gọi thống nhất trong toàn bộ dự án
    public const GUEST      = 'guest';
    public const CUSTOMER   = 'customer';
    public const FARM_STAFF = 'farm_staff';
    public const SALES      = 'sales';
    public const ADMIN      = 'admin';

    protected $fillable = [
        'name',
        'display_name',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'role_id');
    }
}