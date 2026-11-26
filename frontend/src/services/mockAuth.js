// Mock API Xác thực dành cho Người 4 & Người 5

// Mock API đăng nhập (Hỗ trợ 4 vai trò mặc định + tài khoản nhân sự do Admin tạo)
export const mockLogin = async (email, password) => {
    const DEFAULT_USERS = {
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
            const cleanEmail = email?.toLowerCase().trim();
            const customUsers = JSON.parse(
                localStorage.getItem("custom_staff_users") || "{}"
            );

            const matchedDefault = DEFAULT_USERS[cleanEmail];
            const matchedCustom = customUsers[cleanEmail];

            if (matchedDefault && password === "farm123456") {
                resolve({
                    status: "success",
                    token: `mock-jwt-token-${matchedDefault.role}-123456`,
                    user: matchedDefault
                });
            } else if (matchedCustom && password === matchedCustom.password) {
                resolve({
                    status: "success",
                    token: `mock-jwt-token-${matchedCustom.role}-${matchedCustom.id}`,
                    user: matchedCustom
                });
            } else {
                reject(
                    new Error("Email hoặc mật khẩu không chính xác!")
                );
            }
        }, 300);
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