require('../server/loadEnv');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../server/config/database');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...\n');

    const ensureUser = async ({ email, fullName, password, role, bio, phone }) => {
      const passwordHash = await bcrypt.hash(password, 12);
      await client.query(`
        INSERT INTO users (id, full_name, email, password_hash, role, bio, phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO NOTHING
      `, [uuidv4(), fullName, email, passwordHash, role, bio || null, phone || null]);
      const found = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
      return found.rows[0].id;
    };

    const adminId = await ensureUser({
      email: 'admin@elearning.so', fullName: 'Platform Admin', password: 'Admin@1234', role: 'admin',
    });
    console.log('  ✅ Admin ready: admin@elearning.so / Admin@1234');

    const teacherId = await ensureUser({
      email: 'ahmed@elearning.so', fullName: 'Ahmed Hassan', password: 'Teacher@1234', role: 'teacher',
      bio: 'Expert in Computer Science and Programming',
    });
    console.log('  ✅ Teacher ready: ahmed@elearning.so / Teacher@1234');

    const studentId = await ensureUser({
      email: 'fadumo@example.so', fullName: 'Fadumo Abdi', password: 'Student@1234', role: 'student',
      phone: '+252 61 1234567',
    });
    console.log('  ✅ Student ready: fadumo@example.so / Student@1234');

    // 4. Categories
    const categories = [
      { id: uuidv4(), name: 'Information Technology', icon: 'laptop' },
      { id: uuidv4(), name: 'Business & Management', icon: 'briefcase' },
      { id: uuidv4(), name: 'Arabic Language', icon: 'book' },
      { id: uuidv4(), name: 'English Language', icon: 'globe' },
      { id: uuidv4(), name: 'Mathematics', icon: 'calculator' },
      { id: uuidv4(), name: 'Health & Medicine', icon: 'stethoscope' },
    ];

    for (const cat of categories) {
      await client.query(`
        INSERT INTO categories (id, name, icon)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [cat.id, cat.name, cat.icon]);
    }
    console.log('  ✅ Categories seeded');

    // 5. Sample course
    const catResult = await client.query(`SELECT id FROM categories WHERE name = 'Information Technology' LIMIT 1`);
    const catId = catResult.rows[0]?.id;

    const courseSlug = 'intro-web-development';
    await client.query(`
      INSERT INTO courses (id, title, slug, description, price, language, level, category_id, teacher_id, is_published)
      VALUES ($1, 'Introduction to Web Development', $2,
        'Learn HTML, CSS, and JavaScript from scratch. Perfect for beginners.',
        50.00, 'Somali', 'beginner', $3, $4, true)
      ON CONFLICT (slug) DO NOTHING
    `, [uuidv4(), courseSlug, catId, teacherId]);
    const courseId = (await client.query(`SELECT id FROM courses WHERE slug = $1`, [courseSlug])).rows[0].id;

    // 6. Sample section + lessons. Skip when this course was already seeded.
    const existingSection = await client.query(
      `SELECT id FROM sections WHERE course_id = $1 AND title = 'Getting Started' LIMIT 1`,
      [courseId]
    );
    if (!existingSection.rows.length) {
      const sectionId = uuidv4();
      await client.query(`
        INSERT INTO sections (id, course_id, title, order_index)
        VALUES ($1, $2, 'Getting Started', 0)
      `, [sectionId, courseId]);

      await client.query(`
        INSERT INTO lessons (id, section_id, course_id, title, content_type, youtube_url, duration_minutes, order_index)
        VALUES ($1, $2, $3, 'Welcome to the Course', 'youtube', 'https://youtube.com/watch?v=example', 5, 0)
      `, [uuidv4(), sectionId, courseId]);

      await client.query(`
        INSERT INTO lessons (id, section_id, course_id, title, content_type, text_content, duration_minutes, order_index)
        VALUES ($1, $2, $3, 'What is HTML?', 'text', 'HTML stands for HyperText Markup Language...', 10, 1)
      `, [uuidv4(), sectionId, courseId]);
    }

    console.log('  ✅ Sample course with sections and lessons seeded');

    // 7. Grant student access to sample course
    await client.query(`
      INSERT INTO student_course_access (student_id, course_id, granted_by, notes)
      VALUES ($1, $2, $3, 'Seeded for testing')
      ON CONFLICT (student_id, course_id) DO NOTHING
    `, [studentId, courseId, adminId]);
    console.log('  ✅ Student access granted to sample course');

    console.log('\n✅ Seeding complete!\n');
    console.log('Login credentials:');
    console.log('  Admin:   admin@elearning.so  / Admin@1234');
    console.log('  Teacher: ahmed@elearning.so  / Teacher@1234');
    console.log('  Student: fadumo@example.so   / Student@1234');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
