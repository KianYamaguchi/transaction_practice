import express from 'express';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';
const app = express();

app.set('view engine', 'ejs'); // 例：EJSの場合
app.set('views', path.join(__dirname, 'views')); 
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your_secret_key', // 任意の文字列
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // ローカル開発ならfalse
}));

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    error: string;
    // 必要なら他のプロパティも追加
  }
}

const db = mysql.createPool({
  host: "localhost", // MySQLサーバーのホスト名
  user: "root",      // MySQLのユーザー名
  password: "root", // MySQLのパスワード
  database: "money",  // 使用するデータベース名
});

app.get('/register', (req, res) => {
   res.render("register");
});

app.post('/register', async (req, res) => {
    const {username, password, money} = req.body;
    if(!username || !password || !money) return; 

    const hashedpassword = await bcrypt.hash(password, 10);

    try{
    await db.query(
      'INSERT INTO users (username, password, money) VALUES (?, ?, ?)',
      [username, hashedpassword, money],
    )
   }catch(e){
      console.log(e);
     return  res.status(500).send("ユーザー登録に失敗しました。")
   }
     res.redirect('/login');
});

app.get('/login', (req, res) => {
   res.render('login');
});

app.post('/login',async (req, res) => {
   const { username, password } = req.body;
   if(!username || !password) return;

   const rows = await getUserdata(username);
   if(!rows)return;
   const users = rows[0];
   const hashedPassword = users.password;


   const match = await bcrypt.compare(password, hashedPassword);
   if(match){
      req.session.userId = users.userId
      res.redirect('/home');
   } else {
      res.status(401).send("パスワードが違います");
   }
});

async function getUserdata (username: string): Promise<any[]>{
const [rows] = await db.query('SELECT userId, username, password FROM users WHERE username = ? ', [username]);
return Array.isArray(rows) ? rows : [];
}

app.get('/', (req, res) => {
   res.send('hello world');
});

app.get('/home', async (req, res) => {
   const userID = req.session.userId;
   if (!userID){
      return res.redirect("/login");
   }
   const [rows] = await db.query('SELECT userId, username, money FROM users WHERE userId = ?', [userID])
   if (!Array.isArray(rows) || rows.length === 0) return res.status(404).send("ユーザーが見つかりません");
   const users = rows[0];
   const error = req.session.error;
   req.session.error = undefined;
   res.render('home' , {users, error});
});

app.post('/home', async (req, res) => {
    const userID = req.session.userId;
    if (!userID){
       return res.redirect("/login");
   }
   const {username, sendMoney} = req.body
   const sendMoneyNum = Number(sendMoney);

   const conn = await db.getConnection();

   try{

      await conn.beginTransaction();//トランザクション開始

   const [myRows]:any = await conn.query('SELECT money FROM users WHERE userId = ?', [userID]);
   if(!myRows.length){
      throw new Error("あなたの情報の取得に失敗しました")
   }
   const money = myRows[0].money;
   const totalMoney = money - sendMoneyNum;

   if (sendMoneyNum > money) {
         throw new Error("残高不足のためロールバックします");
      }

   await conn.query('UPDATE users SET money = ? WHERE userId = ?', [totalMoney, userID])//ユーザー側の処理終わり


   const [yourRows]:any = await conn.query('SELECT money FROM users WHERE username = ?', [username]);
   if(!yourRows.length) throw new Error("相手ユーザーが見つからなかったのでロールバックします。")

   const yourMoney = yourRows[0].money;
   const totalYourMoney:any = yourMoney + sendMoneyNum
   await conn.query('UPDATE users SET money = ? WHERE username = ?', [totalYourMoney, username])

   await conn.commit();

   } catch(e:any) {
      await conn.rollback();
      req.session.error = e.message || "送金失敗";
      res.redirect("/home");
   }finally{
      conn.release();
   }

   res.redirect("/home");
});

app.listen(3000, () =>{
   console.log("port3000で起動中");
});