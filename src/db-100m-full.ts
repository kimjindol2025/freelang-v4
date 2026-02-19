/**
 * FreeLang v4 × 100M Clone Full Database Test
 * 최대한 많은 데이터 저장
 */

import { DBRuntime } from './db-runtime';

async function main() {
  console.log('\n🚀 FreeLang v4 × 100M Clone Full Database Test');
  console.log('═══════════════════════════════════════════════════\n');

  const db = new DBRuntime();
  
  db.createTable('clone_100m', {
    id: 'i32',
    app: 'string',
    clone_id: 'i32',
    status: 'string',
    throughput: 'i32'
  });

  // 메모리 모니터링
  const getMemUsage = () => {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / (1024 * 1024));
  };

  console.log(`Initial Memory: ${getMemUsage()}MB\n`);

  // Phase: 최대한 큰 배치로 저장 (메모리 한계까지)
  const BATCH_INSERT = 1000000; // 100만씩
  let totalInserted = 0;
  let phase = 1;
  
  const apps = ['proof_ai', 'cwm', 'freelang', 'kim_ai_os'];
  const startTotal = Date.now();

  while (getMemUsage() < 25000) { // 25GB 한계
    console.log(`📊 Phase ${phase}: Batch ${(totalInserted / 1000000).toFixed(1)}M`);
    
    const records = [];
    for (let i = 0; i < BATCH_INSERT; i++) {
      records.push({
        id: totalInserted + i,
        app: apps[(totalInserted + i) % 4],
        clone_id: totalInserted + i,
        status: Math.random() > 0.01 ? 'success' : 'failed',
        throughput: 2000000 + Math.floor(Math.random() * 200000)
      });
    }

    const startPhase = Date.now();
    db.bulkInsert('clone_100m', records);
    const phaseTime = Date.now() - startPhase;

    totalInserted += BATCH_INSERT;
    const mem = getMemUsage();
    
    console.log(`   ✅ ${BATCH_INSERT.toLocaleString()} records in ${phaseTime}ms`);
    console.log(`   📈 Total: ${totalInserted.toLocaleString()} | Memory: ${mem}MB`);
    console.log(`   💾 Rate: ${Math.round((BATCH_INSERT / (phaseTime / 1000))).toLocaleString()} inserts/sec\n`);

    phase++;
    
    if (totalInserted >= 100000000) {
      console.log('✅ Reached 100M records!');
      break;
    }
  }

  const totalTime = Date.now() - startTotal;
  const finalStats = db.getStats('clone_100m');

  console.log('═══════════════════════════════════════════════════');
  console.log('📊 FINAL DATABASE STATISTICS');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`Total Records:      ${finalStats.rows.toLocaleString()}`);
  console.log(`Total Memory:       ${finalStats.memory_mb}MB`);
  console.log(`Per Record:         ${(finalStats.memory_mb * 1024 / finalStats.rows).toFixed(3)}KB`);
  console.log(`Total Time:         ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
  console.log(`Final Memory Usage: ${getMemUsage()}MB\n`);

  console.log(`Records/Sec:        ${Math.round((finalStats.rows / (totalTime / 1000))).toLocaleString()}`);
  
  if (finalStats.rows >= 100000000) {
    console.log(`\n✅ ACHIEVED: 100M+ Clone Database!`);
  } else {
    console.log(`\nReached: ${(finalStats.rows / 1000000).toFixed(1)}M clones`);
    console.log(`Memory Limit: ${getMemUsage()}MB / 30000MB`);
  }

  console.log('\n✅ FreeLang v4 Database Test Complete!\n');
}

main().catch(console.error);
