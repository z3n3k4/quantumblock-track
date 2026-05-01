# Verificación del hash chain

Cada señal en este track record está enlazada criptográficamente con la anterior
mediante un hash SHA256, formando una cadena inmutable. Si cualquier valor
histórico (entry, SL, target, timestamp, símbolo, dirección) se modifica
después de su emisión, el hash de esa fila ya no coincide con su valor original
y la cadena se rompe en ese punto.

## Cómo verificar localmente

1. Descarga `signals.json` (formato completo) o `signals.csv` (para análisis).
2. Para cada fila, recomputa:
   ```
   row_hash = SHA256(prev_hash + "|" + canonical_json(material_fields))
   ```
   donde `material_fields` son: `id, timestamp_emision, symbol, direction,
   timeframe, entry_price, stop_loss, target_1, target_2, target_3, source`.
3. La primera fila usa `prev_hash = "0000...0000"` (64 ceros = genesis).
4. Cada fila siguiente usa el `row_hash` de la fila anterior como `prev_hash`.

## Script de verificación (Python)

```python
import hashlib, json, csv

GENESIS = "0" * 64
MATERIAL_KEYS = ("id", "timestamp_emision", "symbol", "direction",
                 "timeframe", "entry_price", "stop_loss",
                 "target_1", "target_2", "target_3", "source")

def canonical(d):
    return json.dumps(d, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def row_hash(material, prev_hash):
    return hashlib.sha256((prev_hash + "|" + canonical(material)).encode()).hexdigest()

prev = GENESIS
with open("signals.csv") as f:
    for row in csv.DictReader(f):
        # Coerce types: int, str, float (todos los REAL son float)
        material = {
            "id": int(row["id"]),
            "timestamp_emision": row["timestamp_emision"],
            "symbol": row["symbol"],
            "direction": row["direction"],
            "timeframe": row["timeframe"],
            "entry_price": float(row["entry_price"]),
            "stop_loss":   float(row["stop_loss"]),
            "target_1":    float(row["target_1"]),
            "target_2":    float(row["target_2"]) if row["target_2"] else None,
            "target_3":    float(row["target_3"]) if row["target_3"] else None,
            "source": row["source"],
        }
        expected = row_hash(material, prev)
        assert expected == row["row_hash"], f"Tampering en id={row['id']}"
        prev = row["row_hash"]

print("Chain OK")
```

## Qué NO está en el hash

Solo los campos materiales (definidos al momento de la emisión) están en la cadena.
Los timestamps de TP hits, el estado de cierre, el precio de cierre, etc. son
**transiciones observables verificables** — cualquiera puede consultar el
histórico de Binance para confirmar si el precio realmente tocó esos niveles.
