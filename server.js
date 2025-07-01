import socket

# Cấu hình server
SERVER_IP = "0.0.0.0"  # Lắng nghe mọi kết nối
SERVER_PORT = 12345

# Tạo socket TCP
server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind((SERVER_IP, SERVER_PORT))
server_socket.listen(5)

print(f"Server đang chạy tại {SERVER_IP}:{SERVER_PORT}...")

try:
    while True:
        client_socket, client_address = server_socket.accept()
        print(f"Kết nối từ {client_address}")

        data = client_socket.recv(1024).decode()
        print(f"Dữ liệu nhận được: {data}")

        client_socket.close()
except KeyboardInterrupt:
    print("Đóng server...")
finally:
    server_socket.close()
