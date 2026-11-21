import sqlite3
import re
import os
import sys
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.import_ferregonz import parse_sql_values

SQL_FILE = "/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/Ferregonz-05-2026.sql"
DB_FILE = "/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/prisma/diferacsa.db"

def run_import():
    if not os.path.exists(SQL_FILE):
        print(f"ERROR: Archivo SQL no encontrado en {SQL_FILE}")
        return
    if not os.path.exists(DB_FILE):
        print(f"ERROR: Base de datos no encontrada en {DB_FILE}")
        return

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Obtener IDs válidos de sucursal, proveedores y productos
    branches = [r[0] for r in c.execute("SELECT id FROM Branch").fetchall()]
    branch_matriz_id = branches[0] if branches else "branch-matriz"
    valid_suppliers = set(r[0] for r in c.execute("SELECT id FROM Supplier").fetchall())
    valid_products = set(r[0] for r in c.execute("SELECT id FROM Product").fetchall())

    print(f"Sucursal destino: {branch_matriz_id}")
    print(f"Proveedores disponibles: {len(valid_suppliers)}")
    print(f"Productos disponibles: {len(valid_products)}")

    compras_raw = []
    detalles_raw = []

    print("Leyendo compras del archivo SQL...")
    with open(SQL_FILE, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            l = line.strip()
            if l.startswith("INSERT INTO `compra`") or l.startswith("INSERT INTO compra"):
                val_str = l[l.find("VALUES") + 6:].rstrip(";")
                for row in parse_sql_values(val_str):
                    compras_raw.append(row)
            elif l.startswith("INSERT INTO `detallecompra`") or l.startswith("INSERT INTO detallecompra"):
                val_str = l[l.find("VALUES") + 6:].rstrip(";")
                for row in parse_sql_values(val_str):
                    detalles_raw.append(row)

    print(f"Compras encontradas: {len(compras_raw)}")
    print(f"Detalles encontrados: {len(detalles_raw)}")

    # Limpiar compras previas si las hubiera
    c.execute("DELETE FROM PurchaseItem")
    c.execute("DELETE FROM Purchase")
    conn.commit()

    now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

    inserted_compras = 0
    for row in compras_raw:
        # row: [idCompra, Proveedor_idProveedor, Lugar_idLugar, NoComprobante, FechaCompra, Fecha, Total, HayCredito, Credito, FechaEstipulada, Editable, Cancelado]
        cid = str(row[0])
        supplier_id = str(row[1])
        if supplier_id not in valid_suppliers:
            print(f"Advertencia: Proveedor {supplier_id} no existe, omitiendo compra {cid}")
            continue

        doc_num = str(row[3]).strip() if row[3] else ""
        order_number = doc_num if doc_num else f"OC-{int(cid):04d}"
        
        date_str = row[5] or row[4]
        try:
            if date_str:
                dt = datetime.strptime(str(date_str)[:19], "%Y-%m-%d %H:%M:%S" if " " in str(date_str) else "%Y-%m-%d")
                date_val = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            else:
                date_val = now_iso
        except Exception:
            date_val = now_iso

        total = float(row[6]) if row[6] is not None else 0.0
        is_credit = bool(row[7]) if row[7] is not None else False
        credit_val = float(row[8]) if row[8] is not None else 0.0
        is_cancelled = bool(row[11]) if row[11] is not None else False
        status = "Cancelado" if is_cancelled else ("Pendiente" if is_credit and credit_val > 0 else "Recibido")
        notes = f"Comprobante original: {doc_num}" if doc_num else "Importado de Ferregonz SQL"

        c.execute("""
            INSERT INTO Purchase (id, branchId, orderNumber, supplierId, date, total, isCredit, credit, isCancelled, status, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (cid, branch_matriz_id, order_number, supplier_id, date_val, total, is_credit, credit_val, is_cancelled, status, notes, date_val, now_iso))
        inserted_compras += 1

    conn.commit()
    print(f"Insertadas {inserted_compras} compras en la tabla Purchase.")

    inserted_items = 0
    for row in detalles_raw:
        # row: [idDetalleCompra, Producto_Codigo, Compra_idCompra, Cantidad, PrecioCompra, FechaLlegada, Cancelado, Entregado]
        did = f"pi-{row[0]}"
        pid = str(row[1])
        cid = str(row[2])
        qty = float(row[3]) if row[3] is not None else 0.0
        cost = float(row[4]) if row[4] is not None else 0.0
        tot = round(qty * cost, 2)
        is_delivered = bool(row[7]) if row[7] is not None else True

        if pid not in valid_products:
            print(f"Advertencia: Producto {pid} no existe en catálogo, omitiendo item {did}")
            continue

        c.execute("""
            INSERT INTO PurchaseItem (id, purchaseId, productId, quantity, unitCost, total, isDelivered)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (did, cid, pid, qty, cost, tot, is_delivered))
        inserted_items += 1

    conn.commit()
    print(f"Insertados {inserted_items} renglones en la tabla PurchaseItem.")

    # Verificación final
    total_purchases = c.execute("SELECT count(*), sum(total) FROM Purchase").fetchone()
    total_items = c.execute("SELECT count(*), sum(total) FROM PurchaseItem").fetchone()
    print("\n=== RESUMEN DE MIGRACIÓN DE COMPRAS ===")
    print(f"Total Purchases: {total_purchases[0]} registros | Total Q{total_purchases[1]:,.2f}")
    print(f"Total PurchaseItems: {total_items[0]} registros | Total líneas Q{total_items[1]:,.2f}")

    conn.close()

if __name__ == "__main__":
    run_import()
