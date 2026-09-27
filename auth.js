const bcrypt = require("bcryptjs");
const db = require("./database");

function hashPassword(password) {
   return bcrypt.hashSync(password, 12);
}

function verifyPassword(password, hash) {
   return bcrypt.compareSync(password, hash);
}

function registerUser({
   name,
   phone,
   email,
   company,
   password
}) {
   if (!name || !phone || !password) {
       throw new Error("الاسم ورقم الهاتف وكلمة المرور مطلوبة");
   }

   const exists = db
       .prepare("SELECT id FROM users WHERE phone = ?")
       .get(phone);

   if (exists) {
       throw new Error("رقم الهاتف مسجل بالفعل");
   }

   const passwordHash = hashPassword(password);

   const result = db.prepare(`
       INSERT INTO users
       (name, phone, email, company, password_hash)
       VALUES (?, ?, ?, ?, ?)
   `).run(
       name,
       phone,
       email || null,
       company || null,
       passwordHash
   );

   return db
       .prepare(`
           SELECT id, name, phone, email, company, role, created_at
           FROM users
           WHERE id = ?
       `)
       .get(result.lastInsertRowid);
}

function loginUser(phone, password) {
   const user = db
       .prepare("SELECT * FROM users WHERE phone = ?")
       .get(phone);

   if (!user) {
       throw new Error("بيانات الدخول غير صحيحة");
   }

   if (!verifyPassword(password, user.password_hash)) {
       throw new Error("بيانات الدخول غير صحيحة");
   }

   delete user.password_hash;

   return user;
}

function requireLogin(req, res, next) {
   if (!req.session || !req.session.user) {
       return res.status(401).json({
           success: false,
           message: "يجب تسجيل الدخول"
       });
   }

   next();
}

function requireAdmin(req, res, next) {
   if (
       !req.session ||
       !req.session.user ||
       req.session.user.role !== "admin"
   ) {
       return res.status(403).json({
           success: false,
           message: "صلاحيات الإدارة مطلوبة"
       });
   }

   next();
}

module.exports = {
   hashPassword,
   verifyPassword,
   registerUser,
   loginUser,
   requireLogin,
   requireAdmin
};