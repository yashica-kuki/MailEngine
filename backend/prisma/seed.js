const { PrismaClient, TicketStatus, TicketPriority, EmailDirection } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed process...');

  // 1. Fetch your existing logged-in account
  const account = await prisma.account.findFirst();

  if (!account) {
    console.log('⚠️ No account found in the "accounts" table.');
    console.log('💡 Please register/login through your app UI once to create an Account record first, then run `npx prisma db seed`.');
    return;
  }

  console.log(`👤 Seeding test data for account: ${account.email} (ID: ${account.id})`);

  // 2. Create sample tickets using your schema's TicketStatus & TicketPriority enums
  const ticket1 = await prisma.ticket.create({
    data: {
      acc_id: account.id,
      subject: 'Payment failed for monthly campaign plan',
      status: TicketStatus.PENDING_CUSTOMER,
      priority: TicketPriority.HIGH,
      sender_email: 'rohan.sharma@example.com',
      mails: {
        create: [
          {
            subject: 'Payment failed for monthly campaign plan',
            sender_email: 'rohan.sharma@example.com',
            recipient_email: account.email,
            content: 'Hi support team, my card was charged ₹1,499 but my account tier still shows free plan. Can you please check?',
            email_type: 'incoming-complaint',
            direction: EmailDirection.INCOMING
          },
          {
            subject: 'Re: Payment failed for monthly campaign plan',
            sender_email: account.email,
            recipient_email: 'rohan.sharma@example.com',
            content: 'Hello Rohan, we are looking into your transaction details and will update your subscription shortly.',
            email_type: 'approved-draft-placeholder',
            direction: EmailDirection.OUTGOING
          }
        ]
      }
    }
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      acc_id: account.id,
      subject: 'Inquiry regarding bulk email dispatch limit',
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      sender_email: 'ananya.singh@example.com',
      mails: {
        create: [
          {
            subject: 'Inquiry regarding bulk email dispatch limit',
            sender_email: 'ananya.singh@example.com',
            recipient_email: account.email,
            content: 'Hello, what is the maximum number of recipients allowed per batch dispatch in Email Studio?',
            email_type: 'incoming-complaint',
            direction: EmailDirection.INCOMING
          }
        ]
      }
    }
  });

  // 3. Seed contact/recipient records linked to your account
  await prisma.recipient.createMany({
    data: [
      {
        name: 'Rohan Sharma',
        email_add: 'rohan.sharma@example.com',
        acc_id: account.id
      },
      {
        name: 'Ananya Singh',
        email_add: 'ananya.singh@example.com',
        acc_id: account.id
      },
      {
        name: 'Resend Sink Test',
        email_add: 'delivered@resend.dev',
        acc_id: account.id
      }
    ]
  });

  console.log(`✅ Successfully seeded:`);
  console.log(`   - Ticket 1: ${ticket1.tick_id} (PENDING_CUSTOMER) with 2 email logs`);
  console.log(`   - Ticket 2: ${ticket2.tick_id} (OPEN) with 1 email log`);
  console.log(`   - 3 Recipient contacts linked to account ${account.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });