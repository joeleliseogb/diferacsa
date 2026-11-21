#!/usr/bin/env python3
"""
Importador de Usuarios de Ferregonz SQL a Diferacsa SQLite (Casa Matriz)
Mapea usuarios, roles y cargos a la estructura moderna de Diferacsa.
"""

import sqlite3
import re
from datetime import datetime

SQL_PATH = '/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/Ferregonz-05-2026.sql'
DB_PATH = '/home/joel/Documentos/CodeApp/SG-Tienda/Diferacsa/prisma/diferacsa.db'

ROLE_MAPPING = {
    # (idRol, idUsuarioCargo): RoleName in Diferacsa
    (1, 1): 'Admin',
    (1, 2): 'Gerente General',
    (4, 2): 'Gerente de Ventas',
    (3, 2): 'Contable',
    (2, 2): 'Vendedor',
    (2, 3): 'Bodeguero',
}

def to_iso(val):
    if not val or val == 'NULL':
        return datetime.now().isoformat() + 'Z'
    val = val.strip("'\"")
    try:
        dt = datetime.strptime(val, '%Y-%m-%d %H:%M:%S')
        return dt.isoformat() + 'Z'
    except Exception:
        return datetime.now().isoformat() + 'Z'

def main():
    print("--- Importando Usuarios de Ferretería González (Casa Matriz) ---")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Verificar sucursal matriz
    cursor.execute("SELECT id FROM Branch WHERE code = 'MATRIZ'")
    branch_row = cursor.fetchone()
    if not branch_row:
        branch_id = 'branch-matriz'
        cursor.execute("INSERT OR IGNORE INTO Branch (id, code, name, isMain, updatedAt) VALUES (?, 'MATRIZ', 'Casa Matriz - Ferretería González', 1, ?)",
                       (branch_id, datetime.now().isoformat() + 'Z'))
    else:
        branch_id = branch_row[0]

    with open(SQL_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    m = re.search(r'INSERT INTO \`usuario\` VALUES (.*?);', content, re.DOTALL)
    if not m:
        print("ERROR: No se encontró INSERT INTO usuario en el archivo SQL.")
        return

    tuples = re.findall(r'\((.*?)\)', m.group(1))
    print(f"Detectados {len(tuples)} usuarios en SQL dump.")

    imported_count = 0
    now_iso = datetime.now().isoformat() + 'Z'

    for t in tuples:
        parts = [p.strip() for p in t.split(',')]
        if len(parts) < 8:
            continue

        id_usuario = parts[0]
        id_empresa = int(parts[1])
        id_rol = int(parts[2])
        id_cargo = int(parts[3])
        nombres = parts[4].strip("'\" ")
        apellidos = parts[5].strip("'\" ")
        usuario_login = parts[6].strip("'\" ")
        fecha_hora = parts[7].strip("'\" ")

        full_name = f"{nombres} {apellidos}".strip()
        role = ROLE_MAPPING.get((id_rol, id_cargo), 'Vendedor')

        # Especial: si se llama Joel o es admin
        if 'joel' in usuario_login.lower():
            role = 'Admin'
            full_name = f"Joel Eliseo ({nombres} {apellidos})".strip()

        username_clean = usuario_login.lower().replace(' ', '_')
        email = f"{username_clean}@diferacsa.com"
        user_id = f"usr-{id_usuario}"
        created_at = to_iso(fecha_hora)

        cursor.execute("""
            INSERT INTO User (id, username, name, email, role, branchId, pin, password, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, '1234', 'admin', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                username=excluded.username,
                name=excluded.name,
                email=excluded.email,
                role=excluded.role,
                branchId=excluded.branchId,
                updatedAt=excluded.updatedAt
        """, (user_id, username_clean, full_name, email, role, branch_id, created_at, now_iso))
        imported_count += 1
        print(f"  [+] {user_id}: {full_name} | Login: {username_clean} | Rol: {role}")

    conn.commit()
    conn.close()
    print(f"\nÉxito: {imported_count} usuarios importados a SQLite en Casa Matriz.")

if __name__ == '__main__':
    main()
