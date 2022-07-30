const socket = io('http://localhost:8002/',{
    autoConnect: false
});

//set global veriable
const chatBody = document.querySelector('.chat-body');
const UserTitle = document.getElementById('user-title');
const loginContainer = document.querySelector('.login-container')
const userTable = document.querySelector('.users');
const userTagline = document.getElementById('users-tagline');
const activeTitle = document.querySelector('#active-user');
const messages = document.querySelector('.messages');
const msgDiv = document.querySelector('.msg-form');

//Show Latest Messages
scrollBottom = ()=>{
    messages.scrollTop = messages.scrollHeight;
}

//SET GLOBAL METHODS
const method = {
    socketConnect : async(username,userId)=>{
        socket.auth = {username, userId}
        await socket.connect();
    },
    createSession : async (username)=>{
        let options = {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({username})
        } 
        await fetch('/new',options)
        .then(res => res.json())
        .then(data => {
            // console.log(data);
            method.socketConnect = (data.username, data.userId)           
    
        //set localstorage 
        localStorage.setItem('username',data.username);
        localStorage.setItem('userId',data.userId);
    
            loginContainer.classList.add('d-none');
            chatBody.classList.remove('d-none');
            UserTitle.innerHTML = data.username;
        })
        .catch(err => console.log(err));
    },
    activeUser: (username,userId) =>{
        activeTitle.innerHTML = username;

        activeTitle.setAttribute('userId',userId);
        activeTitle.setAttribute('username',username);
        
        //Activr Or Not
        const list = document.getElementsByClassName('socket-user');
        for(let i=0;i< list.length; i++){
            list[i].classList.remove('table-active')
        }
        event.currentTarget.classList.add('table-active');
        
        //display message area after select user
        msgDiv.classList.remove('d-none');
        messages.classList.remove('d-none');
        messages.innerHTML = '';
        
        //for get old messsges
        socket.emit('fetchMsg',({receiver: userId}))        
        const notify = document.getElementById(userId);
        notify.classList.add('d-none');
    },
    appendMessage: ({message,time,background,position})=>{
        let div = document.createElement('div');
        div.classList.add('message','bg-opacity-25','rounded','m-2','px-2','py-1',background,position);
        div.innerHTML = `<span class="msg-text">${message}</span><span class="msg-time">${time}</span>`;
        messages.append(div);
        scrollBottom();
    }
}

//Session veriables 
const UserName = localStorage.getItem('username');
const UserId = localStorage.getItem('userId');

if (UserName && UserId) {    
  method.socketConnect(UserName, UserId);

    loginContainer.classList.add("d-none");
    chatBody.classList.remove("d-none");
    UserTitle.innerHTML = UserName;
}

//login handler
const loginForm = document.querySelector('.user-login');

loginForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    const username = document.getElementById('username');
    method.createSession(username.value.toLowerCase());
    username.value = '';
})

//GET USER LIST
socket.on('users',({users})=>{
    
    //remove self user
    const index = users.findIndex(user => user.userId == socket.id);
    if(index > -1){
        users.splice(index,1);
    }
    //create table
    userTable.innerHTML = '';
    let ul = `<table class = "table">`;
    for (const user of users){
        ul += `<tr class="socket-user" onclick="method.activeUser('${user.username}','${user.userId}')"><td><h6><b>${user.username}<span class="text-danger ps-1 d-none" id="${user.userId}">*<h6></b></span></td><tr>`;
    }
    ul += `</table>`;
    if(users.length > 0){
        userTable.innerHTML = ul;
        userTagline.innerHTML = 'Online Users';
        userTagline.classList.add('text-success');
        userTagline.classList.remove('text-danger');
    }else{
        userTagline.innerHTML = 'No active Users'
        userTagline.classList.remove('text-success');
        userTagline.classList.add('text-danger')
    }
})

//Chat form handler
const msgForm = document.querySelector('.msgForm');
const message = document.getElementById('message');

msgForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    const receiverId = activeTitle.getAttribute('userId');
    const receiver = activeTitle.getAttribute('username');
    let time = new Date().toLocaleString('en-us',{
        hour:"numeric",
        minute:"numeric",
        hour12: true
    });
    //emit message to server
    let payload = {       
        senderId: socket.id,
        receiver,
        receiverId,
        message: message.value,
        time
    }   
    //emit to server
    socket.emit('messageToserver',payload);

    method.appendMessage({...payload,background:"bg-success",position:"right"});

    message.value= '';
    message.focus();
})

//receive message from client
socket.on('messageTouser', ({senderId, message, time}) => {
    const Receiver = activeTitle.getAttribute('userId');   
    const notify = document.getElementById(senderId);
    if (Receiver == null) {
        notify.classList.remove("d-none");
    }
    else if (Receiver == senderId) {
        method.appendMessage({message,time,background: "bg-secondary",position: "left"});  
    } else {
       notify.classList.remove("d-none");
    }
  });

//get old messages 
socket.on('OldMsgs',({messages})=>{
    if(messages.length > 0){
        messages.forEach( msg => {
            let payload = {
                message: msg.message,
                time: msg.time
            }            
            if(msg.from == socket.id){
                method.appendMessage({...payload,background: 'bg-success',position: 'right'})
            }else{
                method.appendMessage({...payload,background:'bg-secondary',position: 'left'});
            }
        });
    }
})
