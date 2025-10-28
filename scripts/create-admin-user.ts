import { prisma } from '../lib/prisma'

async function createAdminUser() {
  try {
    // Check if any users exist
    const userCount = await prisma.user.count()
    
    if (userCount === 0) {
      console.log('No users found. Creating admin user...')
      
      const user = await prisma.user.create({
        data: {
          email: 'yash@localhost',
          name: 'Yash',
          role: 'admin',
          isActive: true,
          phone: '+919900000000' // placeholder
        }
      })
      
      console.log('✅ Admin user created successfully!')
      console.log('User details:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      })
    } else {
      console.log(`✓ Users exist (${userCount} users found)`)
      
      // List existing users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      })
      
      console.log('Existing users:', users)
      
      // Ensure all users are active
      const inactiveCount = users.filter(u => !u.isActive).length
      if (inactiveCount > 0) {
        console.log(`Found ${inactiveCount} inactive users. Activating them...`)
        await prisma.user.updateMany({
          where: { isActive: false },
          data: { isActive: true }
        })
        console.log('✅ All users activated')
      }
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
