<?php

namespace App\Repositories\Contracts;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

interface BaseRepositoryInterface
{
    public function all(array $relations = []): Collection;

    public function paginate(int $perPage = 15, array $relations = []): LengthAwarePaginator;

    public function findById(int $id, array $relations = []): ?Model;

    public function create(array $data): Model;

    public function update(Model $model, array $data): Model;

    public function delete(Model $model): bool;

    public function findByBatchCodeWithTrace(string $batchCode): ?Batch;

    public function getAvailableFefoBatches(int $productId): Collection;
}