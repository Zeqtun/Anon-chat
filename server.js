const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Bekleme Kuyrukları
let listeners = []; // Dinleyiciler
let speakers = [];  // Anlatıcılar

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    // Kullanıcı rol seçip arama başlattığında
    socket.on('find_match', (role) => {
        // Kullanıcıyı temiz bir başlangıç için önce varsa kuyruklardan silelim
        listeners = listeners.filter(s => s.id !== socket.id);
        speakers = speakers.filter(s => s.id !== socket.id);

        let partner = null;

        if (role === 'listener') {
            // Dinleyici ise, Anlatıcı kuyruğuna bak
            if (speakers.length > 0) {
                partner = speakers.shift(); // İlk bekleyen anlatıcıyı al
            } else {
                listeners.push(socket); // Kimse yoksa kuyruğa gir
                socket.emit('status', 'Anlatıcı aranıyor...');
            }
        } else if (role === 'speaker') {
            // Anlatıcı ise, Dinleyici kuyruğuna bak
            if (listeners.length > 0) {
                partner = listeners.shift(); // İlk bekleyen dinleyiciyi al
            } else {
                speakers.push(socket); // Kimse yoksa kuyruğa gir
                socket.emit('status', 'Dinleyici aranıyor...');
            }
        }

        // Eşleşme Bulunduysa
        if (partner) {
            const roomID = socket.id + "#" + partner.id;
            socket.join(roomID);
            partner.join(roomID);

            // İkisine de haber ver
            io.to(roomID).emit('chat_connected', { room: roomID });
            
            // Loglama
            console.log(`Eşleşme: ${role} (${socket.id}) <-> ${role === 'listener' ? 'speaker' : 'listener'} (${partner.id})`);
        }
    });

    // Mesajlaşma
    socket.on('send_message', (data) => {
        // data: { room: '...', message: '...' }
        socket.to(data.room).emit('receive_message', data.message);
    });

    // Kullanıcı Ayrıldığında
    socket.on('disconnect', () => {
        // Kuyruktaysa sil
        listeners = listeners.filter(s => s.id !== socket.id);
        speakers = speakers.filter(s => s.id !== socket.id);
        
        // Buraya "partner ayrıldı" mantığı eklenebilir (room broadcasting ile)
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
    
    // Partnerin ayrıldığını odaya bildirme
    socket.on('leave_chat', (room) => {
         socket.to(room).emit('partner_left');
    });
});

server.listen(3000, () => {
    console.log('Sunucu 3000 portunda, Anlatıcı/Dinleyici moduyla çalışıyor.');
});
