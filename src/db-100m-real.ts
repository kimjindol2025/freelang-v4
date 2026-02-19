/**
 * FreeLang v4 × 100M Clone Real Database Test
 * 30GB 메모리 할당으로 실제 100M 데이터베이스 구축
 */

import { DBRuntime } from './db-runtime';

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
  console.log('║    🚀 FreeLang v4 × 100M CLONE DATABASE - REAL TEST 🚀        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const db = new DBRuntime();
  
  db.createTable('clone_100m_real', {
    id: 'i32',
    app: 'string',
    clone_id: 'i32',
    status: 'string',
    throughput: 'i32'
  });

  const getMemUsage = () => {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / (1024 * 1024));
  };

  console.log(`📊 System Info:`);
  console.log(`   Initial Memory: ${getMemUsage()}MB`);
  console.log(`   Target: 100,000,000 records`);
  console.log(`   Batch Size: 1,000,000 records\n`);

  const BATCH_SIZE = 1000000; // 1M per batch
  const TOTAL_CLONES = 100000000; // 100M
  const NUM_BATCHES = TOTAL_CLONES / BATCH_SIZE; // 100 batches
  
  const apps = ['proof_ai', 'cwm', 'freelang', 'kim_ai_os'];
  let totalInserted = 0;
  const startTotal = Date.now();
  const phaseStartTimes: number[] = [];
  const phaseTimes: number[] = [];

  console.log('🔄 Executing 100 batches...\n');

  for (let batch = 0; batch < NUM_BATCHES; batch++) {
    // 배치 데이터 생성
    const records = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      records.push({
        id: totalInserted + i,
        app: apps[(totalInserted + i) % 4],
        clone_id: totalInserted + i,
        status: Math.random() > 0.01 ? 'success' : 'failed',
        throughput: 2000000 + Math.floor(Math.random() * 200000)
      });
    }

    const batchStart = Date.now();
    const inserted = db.bulkInsert('clone_100m_real', records);
    const batchTime = Date.now() - batchStart;
    
    totalInserted += inserted;
    phaseStartTimes.push(batchStart);
    phaseTimes.push(batchTime);

    const progress = batch + 1;
    const pct = Math.round((progress / NUM_BATCHES) * 100);
    const mem = getMemUsage();
    const rate = Math.round((inserted / (batchTime / 1000)));
    
    // 실시간 진행률 (매 배치마다)
    if (progress % 10 === 0 || progress === NUM_BATCHES) {
      console.log(`${progress.toString().padStart(3)}/${NUM_BATCHES} │ ${pct.toString().padStart(3)}% │ ` +
                  `${formatMemory(mem).padStart(6)} │ ${rate.toLocaleString().padStart(10)} ops/s`);
    }

    // 메모리 한계 체크
    if (mem > 28000) {
      console.log(`\n⚠️  Memory approaching limit (${mem}MB / 30GB)`);
      break;
    }
  }

  const totalTime = Date.now() - startTotal;
  const finalStats = db.getStats('clone_100m_real');
  const finalMem = getMemUsage();

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS - 100M REAL DATABASE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log(`✅ Total Records Stored:    ${finalStats.rows.toLocaleString()}`);
  console.log(`✅ Memory Used:             ${formatMemory(finalMem)}`);
  console.log(`✅ Total Time:              ${formatTime(totalTime)}`);
  console.log(`✅ Total Batches:           ${Math.ceil(finalStats.rows / BATCH_SIZE)}`);
  console.log(`✅ Average Rate:            ${Math.round((finalStats.rows / (totalTime / 1000))).toLocaleString()} inserts/sec\n`);

  console.log(`📈 Memory Efficiency:`);
  console.log(`   Per Record:              ${(finalMem * 1024 / finalStats.rows).toFixed(3)}KB`);
  console.log(`   Estimated for 100M:      ${(finalMem * 100000000 / finalStats.rows / 1024).toFixed(1)}GB\n`);

  console.log(`⏱️  Performance:`);
  const avgBatchTime = phaseTimes.reduce((a, b) => a + b, 0) / phaseTimes.length;
  const minBatchTime = Math.min(...phaseTimes);
  const maxBatchTime = Math.max(...phaseTimes);
  
  console.log(`   Min Batch:               ${minBatchTime}ms`);
  console.log(`   Max Batch:               ${maxBatchTime}ms`);
  console.log(`   Avg Batch:               ${Math.round(avgBatchTime)}ms\n`);

  if (finalStats.rows >= 100000000) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║           🎉 SUCCESS: 100M DATABASE COMPLETE! 🎉              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  } else {
    console.log('📋 Status:');
    console.log(`   Stored: ${finalStats.rows.toLocaleString()} / 100,000,000`);
    console.log(`   Completion: ${((finalStats.rows / 100000000) * 100).toFixed(1)}%`);
    console.log(`   Reason: ${finalMem > 28000 ? 'Memory limit reached' : 'Test completed'}\n`);
  }

  console.log(`🗄️  Database Schema:`);
  console.log(`   Table: clone_100m_real`);
  console.log(`   Columns: id (i32), app (string), clone_id (i32), status (string), throughput (i32)`);
  console.log(`   Index: Primary index on ID column`);
  console.log(`   Type: In-memory with indexing\n`);

  console.log(`📦 Projections:`);
  if (finalStats.rows < 100000000) {
    const scale = 100000000 / finalStats.rows;
    const projTime = totalTime * scale;
    const projMem = finalMem * scale;
    console.log(`   Scale to 100M:           ${scale.toFixed(1)}x`);
    console.log(`   Projected Time:          ${formatTime(projTime)}`);
    console.log(`   Projected Memory:        ${formatMemory(projMem)}\n`);
  }

  console.log('✅ FreeLang v4 × 100M Database Test Complete!\n');
}

main().catch(console.error);
