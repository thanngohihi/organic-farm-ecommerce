
// Mock API Xác thực dành cho Người 4 (Frontend Dev 1)

// Mock API đăng nhập
// Mock API đăng nhập (Hỗ trợ đầy đủ 4 vai trò: Customer, Farm Staff, Sales, Admin)
export const mockLogin = async (email, password) => {
    const MOCK_USERS = {
        "customer@farm.vn": {
            id: 1,
            name: "Nguyễn Văn Khách",
            email: "customer@farm.vn",
            role: "customer",
            avatar: null
        },
        "farm@farm.vn": {
            id: 2,
            name: "Kỹ sư Nông Trại",
            email: "farm@farm.vn",
            role: "farm_staff",
            avatar: null
        },
        "sales@farm.vn": {
            id: 3,
            name: "Nhân viên Bán Hàng",
            email: "sales@farm.vn",
            role: "sales",
            avatar: null
        },
        "admin@farm.vn": {
            id: 4,
            name: "Quản Trị Viên",
            email: "admin@farm.vn",
            role: "admin",
            avatar: null
        }
    };

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const matchedUser = MOCK_USERS[email?.toLowerCase().trim()];

            if (matchedUser && password === "farm123456") {
                resolve({
                    status: "success",
                    token: `mock-jwt-token-${matchedUser.role}-123456`,
                    user: matchedUser
                });
            } else {
                reject(
                    new Error("Email hoặc mật khẩu không chính xác!")
                );
            }
        }, 500);
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
