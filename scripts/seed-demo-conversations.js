const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const customerPhones = [
  '+15550001001', '+15550001002', '+15550001003', '+15550001004', '+15550001005',
  '+15550001006', '+15550001007', '+15550001008', '+15550001009', '+15550001010',
  '+15550001011', '+15550001012', '+15550002001', '+15550002002', '+15550002003',
  '+15550002004', '+15550002005', '+15550002006', '+15550002007', '+15550002008',
  '+15550002009', '+15550002010', '+15550002011', '+15550002012',
];

const conversationTopics = [
  'Product inquiry',
  'Billing question',
  'Technical support needed',
  'Order status check',
  'Refund request',
  'Feature request',
  'Account access issue',
  'Shipping delay',
  'Payment failed',
  'Subscription upgrade',
  'Cancel service',
  'General inquiry',
];

async function seedDemoConversations() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting demo conversation seeding...\n');

    // Get tenant and inboxes
    const tenantResult = await client.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tenantResult.rows[0].id;

    const inboxResult = await client.query(
      'SELECT id, display_name FROM inboxes WHERE tenant_id = $1 ORDER BY id',
      [tenantId]
    );

    if (inboxResult.rows.length === 0) {
      console.log('❌ No inboxes found. Please run migrations first.');
      return;
    }

    console.log(`📥 Found ${inboxResult.rows.length} inboxes:`);
    inboxResult.rows.forEach(inbox => {
      console.log(`   - ${inbox.display_name} (ID: ${inbox.id})`);
    });
    console.log('');

    let totalCreated = 0;
    let phoneIndex = 0;

    // Create 12 conversations for each inbox
    for (const inbox of inboxResult.rows) {
      console.log(`📝 Creating conversations for "${inbox.display_name}"...`);
      
      for (let i = 0; i < 12; i++) {
        const phone = customerPhones[phoneIndex % customerPhones.length];
        const topic = conversationTopics[i % conversationTopics.length];
        const externalId = `ext_conv_demo_${inbox.id}_${Date.now()}_${i}`;
        
        // Vary message counts (1-50)
        const messageCount = Math.floor(Math.random() * 50) + 1;
        
        // Vary last message time (from 5 minutes to 6 hours ago)
        const minutesAgo = Math.floor(Math.random() * 360) + 5;
        const lastMessageAt = new Date(Date.now() - minutesAgo * 60 * 1000);

        try {
          const result = await client.query(
            `INSERT INTO conversations 
             (tenant_id, inbox_id, external_conversation_id, customer_phone_number, 
              state, message_count, last_message_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'QUEUED', $5, $6, NOW(), NOW())
             RETURNING id`,
            [tenantId, inbox.id, externalId, phone, messageCount, lastMessageAt]
          );

          const conversationId = result.rows[0].id;

          // Calculate priority score
          await client.query(
            `UPDATE conversations c
             SET priority_score = calculate_priority_score(
               c.message_count,
               c.last_message_at,
               t.priority_alpha,
               t.priority_beta
             )
             FROM tenants t
             WHERE c.tenant_id = t.id AND c.id = $1`,
            [conversationId]
          );

          totalCreated++;
          console.log(`   ✅ Created: ${phone} - ${messageCount} msgs, ${minutesAgo}m ago (ID: ${conversationId})`);
        } catch (error) {
          console.log(`   ⚠️  Skipped: ${phone} (may already exist)`);
        }

        phoneIndex++;
      }
      console.log('');
    }

    console.log(`\n🎉 Successfully created ${totalCreated} demo conversations!`);
    console.log('\n📊 Summary by inbox:');

    // Show summary
    for (const inbox of inboxResult.rows) {
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM conversations 
         WHERE inbox_id = $1 AND state = 'QUEUED'`,
        [inbox.id]
      );
      console.log(`   ${inbox.display_name}: ${countResult.rows[0].count} queued conversations`);
    }

    console.log('\n✅ Demo data ready! You can now:');
    console.log('   1. Test the /conversations endpoint');
    console.log('   2. Test auto-allocation');
    console.log('   3. Test priority sorting');
    console.log('   4. Test manual claim');
    console.log('\n🚀 Server is ready for demo!');

  } catch (error) {
    console.error('❌ Error seeding demo conversations:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeding
seedDemoConversations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
