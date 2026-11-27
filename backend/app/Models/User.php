<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'role_id',
        'full_name',
        'email',
        'phone',
        'password',
        'avatar_url',
        'address',
        'latitude',
        'longitude',
        'loyalty_points',
        'is_active',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'latitude'       => 'decimal:8',
        'longitude'      => 'decimal:8',
        'loyalty_points' => 'integer',
        'is_active'      => 'boolean',
        'password'       => 'hashed', // Tự động mã hóa Bcrypt khi gán giá trị trong Laravel 10/11
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'customer_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    // Kiểm tra nhanh xem User có thuộc 1 hoặc nhiều Role hay không
    public function hasRole(string|array $roles): bool
    {
        if (!$this->relationLoaded('role')) {
            $this->load('role');
        }

        if (!$this->role) {
            return false;
        }

        $roles = (array) $roles;
        return in_array($this->role->name, $roles, true);
    }
}