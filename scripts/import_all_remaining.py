import sqlite3
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.import_ferregonz import parse_sql_values

SQL_FILE = "/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/Ferregonz-05-2026.sql"
DB_FILE = "/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/prisma/diferacsa.db"

def format_iso_z(val_str):
    if not val_str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    s = str(val_str).strip()
    try:
        if " " in s:
            dt = datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
        else:
            dt = datetime.strptime(s[:10], "%Y-%m-%d")
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

def run_import():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    cust_ids = set(r[0] for r in c.execute("SELECT id FROM Customer").fetchall())
    inv_ids = set(r[0] for r in c.execute("SELECT id FROM Invoice").fetchall())
    item_ids = set(r[0] for r in c.execute("SELECT id FROM InvoiceItem").fetchall())

    data = {
        "productomedida": [],
        "productomedidaderivado": [],
        "movimientocreditos": [],
        "envio": [],
        "detalleenvio": [],
        "notacredito": []
    }

    print("Leyendo tablas restantes del archivo SQL...")
    with open(SQL_FILE, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            l = line.strip()
            if l.startswith("INSERT INTO"):
                for t in data:
                    if f"`{t}`" in l or f"INSERT INTO {t}" in l:
                        val_str = l[l.find("VALUES") + 6:].rstrip(";")
                        for row in parse_sql_values(val_str):
                            data[t].append(row)

    now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. Unidades de Medida
    print("\n--- 1. Importando Unidades de Medida ---")
    c.execute("DELETE FROM UnitConversion")
    c.execute("DELETE FROM UnitOfMeasure")
    conn.commit()

    medida_ids = set()
    for row in data["productomedida"]:
        # row: [idProductoMedida, Medida]
        mid = int(row[0])
        name = str(row[1]).strip() if row[1] else f"MEDIDA-{mid}"
        c.execute("INSERT OR REPLACE INTO UnitOfMeasure (id, name) VALUES (?, ?)", (mid, name))
        medida_ids.add(mid)

    for row in data["productomedidaderivado"]:
        # row: [idProductoMedidaDerivado, Nombre, FactorConversion, ProductoMedida_idProductoMedida]
        did = int(row[0])
        name = str(row[1]).strip() if row[1] else f"DERIVADO-{did}"
        factor = float(row[2]) if row[2] is not None else 1.0
        mid = int(row[3])
        if mid in medida_ids:
            c.execute("INSERT OR REPLACE INTO UnitConversion (id, name, factor, unitOfMeasureId) VALUES (?, ?, ?, ?)", (did, name, factor, mid))

    conn.commit()
    print(f"Unidades de medida importadas: {len(data['productomedida'])}")
    print(f"Conversiones importadas: {len(data['productomedidaderivado'])}")

    # 2. Movimientos de Crédito de Clientes (Abonos)
    print("\n--- 2. Importando Movimientos de Crédito (Abonos) ---")
    c.execute("DELETE FROM CustomerCreditMovement")
    conn.commit()

    inserted_credits = 0
    for row in data["movimientocreditos"]:
        # row: [idMovimientoCreditos, Motivo, FechaHora, Debito, Credito, Saldo, Usuario, Host, Cliente_idCliente, PagoCredito_idPagoCredito, Factura_idFactura]
        mid = str(row[0])
        reason = str(row[1]).strip() if row[1] else ""
        date_val = format_iso_z(row[2])
        debit = float(row[3]) if row[3] is not None else 0.0
        credit = float(row[4]) if row[4] is not None else 0.0
        balance = float(row[5]) if row[5] is not None else 0.0
        user_name = str(row[6]).strip() if row[6] else None
        cid = str(row[8])
        inv_id = str(row[10]) if row[10] is not None else None

        if cid not in cust_ids:
            continue
        if inv_id and inv_id not in inv_ids:
            inv_id = None

        c.execute("""
            INSERT INTO CustomerCreditMovement (id, customerId, invoiceId, date, reason, debit, credit, balance, userName, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (mid, cid, inv_id, date_val, reason, debit, credit, balance, user_name, date_val))
        inserted_credits += 1

    conn.commit()
    print(f"Movimientos de crédito de clientes importados: {inserted_credits}")

    # 3. Envíos y Despachos
    print("\n--- 3. Importando Envíos y Despachos ---")
    c.execute("DELETE FROM DeliveryItem")
    c.execute("DELETE FROM Delivery")
    conn.commit()

    valid_delivery_ids = set()
    inserted_deliveries = 0
    for row in data["envio"]:
        # row: [id, Fecha, Factura_idFactura]
        did = str(row[0])
        date_val = format_iso_z(row[1])
        inv_id = str(row[2])
        if inv_id in inv_ids:
            c.execute("""
                INSERT INTO Delivery (id, invoiceId, date, status, notes, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (did, inv_id, date_val, "ENTREGADO", "Despacho registrado en sistema", date_val))
            valid_delivery_ids.add(did)
            inserted_deliveries += 1

    inserted_del_items = 0
    for row in data["detalleenvio"]:
        # row: [id, Cantidad, Envio_id, DetalleFactura_idDetalleFactura]
        di_id = str(row[0])
        qty = float(row[1]) if row[1] is not None else 1.0
        did = str(row[2])
        item_id = str(row[3])
        if did in valid_delivery_ids and item_id in item_ids:
            c.execute("""
                INSERT INTO DeliveryItem (id, deliveryId, invoiceItemId, quantity)
                VALUES (?, ?, ?, ?)
            """, (di_id, did, item_id, qty))
            inserted_del_items += 1

    conn.commit()
    print(f"Envíos/Despachos importados: {inserted_deliveries}")
    print(f"Detalles de envío importados: {inserted_del_items}")

    # 4. Notas de Crédito
    print("\n--- 4. Importando Notas de Crédito ---")
    c.execute("DELETE FROM CreditNote")
    conn.commit()

    inserted_cn = 0
    for row in data["notacredito"]:
        # row: [idNotaCredito, DetalleFactura_idDetalleFactura, SerieNotaCredito_idSerieNotaCredito, CantDevuelto, FechaHora, NoNotaCredito]
        cnid = str(row[0])
        item_id = str(row[1])
        qty = float(row[3]) if row[3] is not None else 1.0
        date_val = format_iso_z(row[4])
        doc_no = str(row[5]) if row[5] is not None else f"NC-{cnid}"

        if item_id in item_ids:
            c.execute("""
                INSERT INTO CreditNote (id, invoiceItemId, creditNoteNumber, quantityReturned, date, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (cnid, item_id, doc_no, qty, date_val, date_val))
            inserted_cn += 1

    conn.commit()
    print(f"Notas de crédito importadas: {inserted_cn}")

    # Resumen final de tablas en diferacsa.db
    print("\n================ TOTALES FINALES EN BASE DE DATOS ================")
    tables = [
        "Branch", "Warehouse", "Category", "Product", "ProductStock", "ProductPrice",
        "Customer", "Supplier", "Invoice", "InvoiceItem", "Purchase", "PurchaseItem",
        "CustomerCreditMovement", "Delivery", "DeliveryItem", "CreditNote",
        "UnitOfMeasure", "UnitConversion", "User"
    ]
    for t in tables:
        cnt = c.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        print(f"  ✓ {t}: {cnt:,} registros")

    conn.close()

if __name__ == "__main__":
    run_import()
