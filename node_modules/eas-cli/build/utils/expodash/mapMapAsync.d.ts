export default function mapMapAsync<K, V, M>(map: ReadonlyMap<K, V>, mapper: (value: V, key: K) => Promise<M>): Promise<Map<K, M>>;
