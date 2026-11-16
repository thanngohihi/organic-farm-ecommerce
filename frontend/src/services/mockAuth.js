
// Mock API Xác thực dành cho Người 4 (Frontend Dev 1)

// Mock API đăng nhập
export const mockLogin = async (email, password) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (
                email === "customer@farm.vn" &&
                password === "farm123456"
            ) {
                resolve({
                    status: "success",
                    token: "mock-jwt-token-customer-123456",
                    user: {
                        id: 1,
                        name: "Nguyễn Văn Khách",
                        email: "customer@farm.vn",
                        role: "customer",
                        avatar: null
                    }
                });
            } else {
                reject(
                    new Error("Email hoặc mật khẩu không chính xác!")
                );
            }
        }, 800);
    });
};

// Mock API đăng ký
export const mockRegister = async (name, email, password) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                status: "success",
                message: "Đăng ký tài khoản thành công!",
                user: {
                    id: Date.now(),
                    name: name,
                    email: email,
                    role: "customer"
                }
            });
        }, 800);
    });
};
