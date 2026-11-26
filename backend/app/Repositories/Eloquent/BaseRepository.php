<?php

namespace App\Repositories\Eloquent;

use App\Models\Batch;
use App\Repositories\Contracts\BatchRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class BatchRepository implements BatchRepositoryInterface
{
    public function __construct(private readonly Batch $model) {}

    public function all(array $relations = []): Collection
    {
        return $this->model->newQuery()->with($relations)->get();
    }

    public function findById(int $id, array $relations = []): ?Batch
    {
        return $this->model->newQuery()->with($relations)->find($id);
    }

    public function create(array $data): Batch
    {
        return $this->model->newQuery()->create($data);
    }

    public function update($model, array $data): Batch
    {
        $model->update($data);
        return $model->fresh();
    }

    public function delete($model): bool
    {
        return (bool) $model->delete();
    }

    public function findByBatchCodeWithTrace(string $batchCode): ?Batch
    {
        return $this->model->newQuery()
            ->with([
                'product.category:id,name,slug',
                'farmStaff:id,full_name',
                'farmingLogs' => fn($q) => $q->orderBy('logged_at'),
            ])
            ->where('batch_code', $batchCode)
            ->first();
    }

    public function getAvailableFefoBatches(int $productId): Collection
    {
        return $this->model->newQuery()
            ->where('product_id', $productId)
            ->whereIn('status', ['con_hang', 'sap_het_han'])
            ->whereDate('expiry_date', '>', now()->toDateString())
            ->where('current_quantity', '>', 0)
            ->orderBy('expiry_date')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();
    }
}