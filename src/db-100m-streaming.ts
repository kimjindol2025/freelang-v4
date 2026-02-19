/**
 * FreeLang v4 × 100M Clone Database - Streaming to Disk
 * 메모리 + 디스크 하이브리드 모드
 */

import * as fs from 'fs';

export class StreamingDB {
  private outputFile: fs.WriteStream;
  private recordCount = 0;
  private memoryRecords: any[] = [];
  private memoryLimit = 100000; // 메모리에 10만개씩만 유지

  constructor(filename: string) {
    this.outputFile = fs.createWriteStream(filename, { flags: 'w' });
    this.outputFile.write('[\n');
  }

  insert(record: any): void {
    this.memoryRecords.push(record);
    
    if (this.memoryRecords.length >= this.memoryLimit) {
      this.flushToFile();
    }
  }

  private flushToFile(): void {
    for (let i = 0; i < this.memoryRecords.length; i++) {
      const record = this.memoryRecords[i];
      const json = JSON.stringify(record);
      const isLast = (this.recordCount + i + 1) % 10 === 0 ? '' : ',';
      this.outputFile.write('  ' + json + (isLast || i < this.memoryRecords.length - 1 ? ',\n' : '\n'));
    }
    this.recordCount += this.memoryRecords.length;
    this.memoryRecords = [];
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.flushToFile();
      this.outputFile.write(']');
      this.outputFile.end(() => resolve());
    });
  }

  getRecordCount(): number {
    return this.recordCount + this.memoryRecords.length;
  }
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatMemory(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(0)}MB`;
  return `${(mb / 1024).toFixed(1)}GB`;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 FreeLang v4 × 100M CLONE DATABASE (Streaming) 🚀        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const outputFile = '/tmp/clone_100m_database.json';
  const db = new StreamingDB(outputFile);

  const getMemUsage = () => {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / (1024 * 1024));
  };

  console.log(`📊 Configuration:`);
  console.log(`   Memory Allocated: 30GB`);
  console.log(`   Output File: ${outputFile}`);
  console.log(`   Target: 100,000,000 records`);
  console.log(`   Strategy: Streaming to disk\n`);

  const BATCH_SIZE = 1000000;
  const NUM_BATCHES = 100;
  const apps = ['proof_ai', 'cwm', 'freelang', 'kim_ai_os'];
  let totalInserted = 0;
  const startTotal = Date.now();

  console.log('🔄 Generating & Streaming 100M records...\n');
  console.log('Batch  │ Records (M) │ Memory   │ Speed');
  console.log('─────────┼─────────────┼──────────┼──────────────');

  for (let batch = 0; batch < NUM_BATCHES; batch++) {
    const batchStart = Date.now();
    
    // 배치 데이터 생성 및 저장 (개별 insert로 처리)
    for (let i = 0; i < BATCH_SIZE; i++) {
      db.insert({
        id: totalInserted + i,
        app: apps[(totalInserted + i) % 4],
        clone_id: totalInserted + i,
        status: Math.random() > 0.01 ? 'success' : 'failed',
        throughput: 2000000 + Math.floor(Math.random() * 200000)
      });
    }

    const batchTime = Date.now() - batchStart;
    totalInserted += BATCH_SIZE;
    const mem = getMemUsage();
    const rate = Math.round((BATCH_SIZE / (batchTime / 1000)));
    const totalRecords = db.getRecordCount();

    console.log(`${(batch + 1).toString().padStart(3)}    │ ${(totalRecords / 1000000).toFixed(1)}.0         │ ${formatMemory(mem).padStart(6)} │ ${rate.toLocaleString().padStart(10)}/s`);

    if ((batch + 1) % 25 === 0) {
      const elapsed = Date.now() - startTotal;
      const eta = (elapsed / (batch + 1)) * (NUM_BATCHES - batch - 1);
      console.log(`       │ ETA: ${formatTime(eta).padStart(10)}`);
    }
  }

  // 파일 닫고 완료
  await db.close();
  
  const totalTime = Date.now() - startTotal;
  const finalCount = db.getRecordCount();
  const fileSize = fs.statSync(outputFile).size;

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('🏆 FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log(`✅ Records Generated:       ${finalCount.toLocaleString()}`);
  console.log(`✅ File Size:               ${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB`);
  console.log(`✅ Total Time:              ${formatTime(totalTime)}`);
  console.log(`✅ Average Throughput:      ${Math.round((finalCount / (totalTime / 1000))).toLocaleString()} records/sec\n`);

  const pct = ((finalCount / 100000000) * 100).toFixed(1);
  console.log(`📊 Completion: ${pct}% (${finalCount.toLocaleString()} / 100,000,000)\n`);

  if (finalCount >= 100000000) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║      🎉 100M DATABASE SUCCESSFULLY CREATED! 🎉               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  }

  console.log(`💾 File Info:`);
  console.log(`   Path: ${outputFile}`);
  console.log(`   Size: ${formatMemory(fileSize / (1024 * 1024))}`);
  console.log(`   Records: ${finalCount.toLocaleString()}`);
  console.log(`   Bytes/Record: ${(fileSize / finalCount).toFixed(0)}\n`);

  console.log('✅ Test Complete!\n');
}

main().catch(console.error);
