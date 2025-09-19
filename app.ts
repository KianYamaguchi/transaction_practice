import express from 'express';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';
import helmet from 'helmet';
const app = express();

app.set('view engine', 'ejs'); // 例：EJSの場合
app.set('views', path.join(__dirname, 'views')); 
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

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
    message: string;
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
   res.render("register" , { error: null });
});

app.post('/register', async (req, res) => {
    const {username, password, money} = req.body;
    if(!username || !password || !money) {
      return res.render("register", {error: "すべての項目を入力してください"});
    } 

    try{
   const hashedpassword = await bcrypt.hash(password, 10);
   if(!hashedpassword){
      throw Error;
   }
   await db.query(
      'INSERT INTO users (username, password, money) VALUES (?, ?, ?)',
      [username, hashedpassword, money],
    )
   }catch(e){
      console.log(e);
     return  res.render("register", {error: "ユーザー登録に失敗しました"});
   }
     res.redirect('/login');
});

app.get('/login', (req, res) => {
   res.render('login', { error: null});
});

async function getUserdata (username: string): Promise<any[]>{
const [rows] = await db.query('SELECT userId, username, password FROM users WHERE username = ? ', [username]);
return Array.isArray(rows) ? rows : [];
}

app.post('/login',async (req, res) => {
   const { username, password } = req.body;
   if(!username || !password) return;

   const rows = await getUserdata(username);
   if(!rows){
      res.render("login", { error: "ユーザ名が一致しませんでした。"})
   }
   const users = rows[0];
   const hashedPassword = users.password;

   const match = await bcrypt.compare(password, hashedPassword);
   if(match){
      req.session.userId = users.userId
      res.redirect('/home');

   } else {
      return res.render("login", { error: "パスワードが一致しませんでした。"})
   }
});

app.get('/', (req, res) => {
  res.redirect("/home");
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
   const message: any = req.session.message;
   req.session.message = undefined;
   res.render('home' , {users, error, message});
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

   const [myRows]:any = await conn.query('SELECT money, username FROM users WHERE userId = ?', [userID]);

   const money = myRows[0].money;
   const myUsername =myRows[0].username;
   if (sendMoneyNum < 0 || Number.isInteger(sendMoneyNum) == false ){
      throw new Error("正しい金額を入力してください。")
   }
   const totalMoney = money - sendMoneyNum;
   if(myUsername == username){
      throw new Error("入力したのはあなたのユーザー名です。他のユーザーに送金してください。")
   }

   if (sendMoneyNum > money) {
         throw new Error("残高不足のためロールバックしました。金額をご確認ください。");
      }

   await conn.query('UPDATE users SET money = ? WHERE userId = ?', [totalMoney, userID])//ユーザー側の処理終わり


   const [yourRows]:any = await conn.query('SELECT money FROM users WHERE username = ?', [username]);
   if(!yourRows.length) throw new Error("相手ユーザーが見つからなかったのでロールバックしました。ユーザー名をご確認ください。")

   const yourMoney = yourRows[0].money;
   const totalYourMoney:any = yourMoney + sendMoneyNum
   await conn.query('UPDATE users SET money = ? WHERE username = ?', [totalYourMoney, username])

   await conn.commit();

   req.session.message = "トランザクションが成功しました"
   res.redirect("/home");

   } catch(e:any) {
      await conn.rollback();
      req.session.error = e.message || "予期せぬエラーが発生しました。もう一度お試しください";
      res.redirect("/home");

   }finally{
      conn.release();
   }
});


app.listen(3000, () =>{
   console.log("port3000で起動中");
});