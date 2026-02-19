/**
 * FreeLang v4 Database Runtime
 * 100M Clone 데이터베이스 구축 및 테스트
 */

import { Program, Stmt, Expr, Pattern } from './ast';
import { Lexer } from './lexer';
import { Parser } from './parser';

// ============================================================
// 데이터베이스 타입
// ============================================================

interface Record {
  [key: string]: any;
}

interface Table {
  schema: { [key: string]: string };
  rows: Record[];
  indices: Map<string, Map<any, number[]>>;
}

// ============================================================
// FreeLang v4 DB Runtime
// ============================================================

export class DBRuntime {
  private tables: Map<string, Table> = new Map();
  private variables: Map<string, any> = new Map();

  // INSERT
  insert(tableName: string, record: Record): boolean {
    const table = this.tables.get(tableName);
    if (!table) {
      console.error(`Table "${tableName}" not found`);
      return false;
    }

    // 스키마 검증
    for (const [key, type] of Object.entries(table.schema)) {
      if (!(key in record)) {
        console.error(`Missing field "${key}" in record`);
        return false;
      }
    }

    table.rows.push(record);

    // 인덱스 업데이트
    for (const [field, index] of table.indices) {
      const value = record[field];
      if (!index.has(value)) {
        index.set(value, []);
      }
      index.get(value)!.push(table.rows.length - 1);
    }

    return true;
  }

  // SELECT by ID
  selectById(tableName: string, id: number): Record | null {
    const table = this.tables.get(tableName);
    if (!table) return null;

    // 인덱스로 빠른 조회
    const idIndex = table.indices.get('id');
    if (idIndex && idIndex.has(id)) {
      const indices = idIndex.get(id)!;
      return table.rows[indices[0]] || null;
    }

    // 풀 스캔
    for (const row of table.rows) {
      if (row['id'] === id) return row;
    }
    return null;
  }

  // SELECT all
  selectAll(tableName: string): Record[] {
    const table = this.tables.get(tableName);
    return table ? table.rows : [];
  }

  // CREATE TABLE
  createTable(name: string, schema: { [key: string]: string }): void {
    this.tables.set(name, {
      schema,
      rows: [],
      indices: new Map([['id', new Map()]])
    });
  }

  // STATS
  getStats(tableName: string): { table: string; rows: number; memory_mb: number } {
    const table = this.tables.get(tableName);
    if (!table) return { table: tableName, rows: 0, memory_mb: 0 };

    // 대략적인 메모리 계산 (JSON 직렬화)
    const json = JSON.stringify(table.rows);
    const memory_bytes = Buffer.byteLength(json, 'utf8');
    const memory_mb = memory_bytes / (1024 * 1024);

    return {
      table: tableName,
      rows: table.rows.length,
      memory_mb: Math.round(memory_mb * 100) / 100
    };
  }

  // BULK INSERT (고성능)
  bulkInsert(tableName: string, records: Record[]): number {
    const table = this.tables.get(tableName);
    if (!table) return 0;

    let count = 0;
    for (const record of records) {
      table.rows.push(record);
      
      // 인덱스 업데이트
      for (const [field, index] of table.indices) {
        const value = record[field];
        if (!index.has(value)) {
          index.set(value, []);
        }
        index.get(value)!.push(table.rows.length - 1);
      }
      count++;
    }
    return count;
  }
}

// ============================================================
// 메인: 100M Clone Database Test
// ============================================================

async function main() {
  console.log('\n🚀 FreeLang v4 Database Runtime');
  console.log('================================\n');

  const db = new DBRuntime();

  // 스키마 정의
  db.createTable('clone_results', {
    id: 'i32',
    app: 'string',
    clone_id: 'i32',
    status: 'string',
    test_time_ms: 'f64'
  });

  // Phase 1: 작은 규모 테스트
  console.log('📊 Phase 1: Inserting 100K records...');
  const start1 = Date.now();
  for (let i = 0; i < 100000; i++) {
    db.insert('clone_results', {
      id: i,
      app: ['proof_ai', 'cwm', 'freelang', 'kim_ai_os'][i % 4],
      clone_id: i,
      status: Math.random() > 0.01 ? 'success' : 'failed',
      test_time_ms: Math.random() * 100
    });
  }
  const time1 = Date.now() - start1;
  let stats1 = db.getStats('clone_results');
  console.log(`✅ 100K inserted in ${time1}ms`);
  console.log(`   Rows: ${stats1.rows}, Memory: ${stats1.memory_mb}MB\n`);

  // Phase 2: 대규모 테스트 (100K → 1M)
  console.log('📊 Phase 2: Scaling to 1M records...');
  const start2 = Date.now();
  for (let i = 100000; i < 1000000; i++) {
    db.insert('clone_results', {
      id: i,
      app: ['proof_ai', 'cwm', 'freelang', 'kim_ai_os'][i % 4],
      clone_id: i,
      status: Math.random() > 0.01 ? 'success' : 'failed',
      test_time_ms: Math.random() * 100
    });
  }
  const time2 = Date.now() - start2;
  stats1 = db.getStats('clone_results');
  console.log(`✅ 900K inserted in ${time2}ms`);
  console.log(`   Total: ${stats1.rows} rows, Memory: ${stats1.memory_mb}MB\n`);

  // Phase 3: 쿼리 성능 (SELECT)
  console.log('📊 Phase 3: Query Performance...');
  const queries = 10000;
  const start3 = Date.now();
  for (let i = 0; i < queries; i++) {
    const randomId = Math.floor(Math.random() * 1000000);
    db.selectById('clone_results', randomId);
  }
  const time3 = Date.now() - start3;
  const qps = Math.round((queries / time3) * 1000);
  console.log(`✅ ${queries} queries in ${time3}ms`);
  console.log(`   ${qps.toLocaleString()} queries/sec\n`);

  // Phase 4: BULK INSERT 성능
  console.log('📊 Phase 4: Bulk Insert (추가 100K)...');
  const bulkRecords = [];
  for (let i = 1000000; i < 1100000; i++) {
    bulkRecords.push({
      id: i,
      app: ['proof_ai', 'cwm', 'freelang', 'kim_ai_os'][i % 4],
      clone_id: i,
      status: 'success',
      test_time_ms: Math.random() * 100
    });
  }

  const start4 = Date.now();
  const inserted = db.bulkInsert('clone_results', bulkRecords);
  const time4 = Date.now() - start4;
  stats1 = db.getStats('clone_results');
  console.log(`✅ ${inserted.toLocaleString()} records inserted in ${time4}ms`);
  console.log(`   Total: ${stats1.rows.toLocaleString()} rows, Memory: ${stats1.memory_mb}MB`);
  console.log(`   Rate: ${Math.round((inserted / time4) * 1000).toLocaleString()} inserts/sec\n`);

  // 최종 리포트
  console.log('═══════════════════════════════════════════════');
  console.log('📊 FINAL REPORT');
  console.log('═══════════════════════════════════════════════\n');
  
  const finalStats = db.getStats('clone_results');
  console.log(`Table:          clone_results`);
  console.log(`Total Records:  ${finalStats.rows.toLocaleString()}`);
  console.log(`Memory Used:    ${finalStats.memory_mb}MB`);
  console.log(`Avg Per Record: ${(finalStats.memory_mb * 1024 / finalStats.rows).toFixed(2)}KB\n`);

  console.log(`Operations Summary:`);
  console.log(`  Phase 1 (100K):  ${time1}ms`);
  console.log(`  Phase 2 (900K):  ${time2}ms`);
  console.log(`  Phase 3 (Queries): ${time3}ms (${qps.toLocaleString()} qps)`);
  console.log(`  Phase 4 (Bulk):  ${time4}ms (${Math.round((inserted / time4) * 1000).toLocaleString()} inserts/sec)`);
  console.log('\n✅ FreeLang v4 Database Test Complete!');
}

main().catch(console.error);
