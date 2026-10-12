const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BTL Mobile API',
      version: '1.0.0',
      description: 'API To-Do List cho ứng dụng mobile',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 5257}` }],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            fullName: { type: 'string', nullable: true },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nguoiDungId: { type: 'integer' },
            danhMucId: { type: 'integer', nullable: true },
            tieuDe: { type: 'string' },
            moTa: { type: 'string', nullable: true },
            mucDoUuTien: { type: 'string', enum: ['THAP', 'TRUNG_BINH', 'CAO'] },
            trangThai: { type: 'string', enum: ['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'] },
            ngayBatDau: { type: 'string', format: 'date-time', nullable: true },
            hanHoanThanh: { type: 'string', format: 'date-time', nullable: true },
            ngayHoanThanh: { type: 'string', format: 'date-time', nullable: true },
            ngayTao: { type: 'string', format: 'date-time' },
            ngayCapNhat: { type: 'string', format: 'date-time' },
            ngayXoa: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nguoiDungId: { type: 'integer' },
            tenDanhMuc: { type: 'string' },
            moTa: { type: 'string', nullable: true },
            mauSac: { type: 'string', nullable: true },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nguoiDungId: { type: 'integer' },
            congViecId: { type: 'integer', nullable: true },
            tieuDe: { type: 'string' },
            noiDung: { type: 'string', nullable: true },
            daDoc: { type: 'boolean' },
            ngayTao: { type: 'string', format: 'date-time' },
          },
        },
        Reminder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            congViecId: { type: 'integer' },
            thoiGianNhac: { type: 'string', format: 'date-time' },
            loaiNhac: { type: 'string' },
            daGui: { type: 'boolean' },
          },
        },
        TaskHistory: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            congViecId: { type: 'integer' },
            trangThaiCu: { type: 'string', nullable: true },
            trangThaiMoi: { type: 'string', nullable: true },
            thoiGianThayDoi: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      // AUTH
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Đăng ký tài khoản',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'email', 'password'],
                  properties: {
                    username: { type: 'string' },
                    email: { type: 'string' },
                    password: { type: 'string' },
                    fullName: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Đăng ký thành công', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            400: { description: 'Dữ liệu không hợp lệ' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Đăng nhập',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['usernameOrEmail', 'password'],
                  properties: {
                    usernameOrEmail: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Đăng nhập thành công', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { description: 'Sai thông tin đăng nhập' },
          },
        },
      },
      // USERS
      '/api/users': {
        get: {
          tags: ['Users'],
          summary: 'Lấy danh sách người dùng',
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } },
        },
      },
      '/api/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Lấy người dùng theo ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, 404: { description: 'Không tìm thấy' } },
        },
        put: {
          tags: ['Users'],
          summary: 'Cập nhật người dùng',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { fullName: { type: 'string' }, email: { type: 'string' }, avatarUrl: { type: 'string' } } },
              },
            },
          },
          responses: { 204: { description: 'Cập nhật thành công' }, 404: { description: 'Không tìm thấy' } },
        },
        delete: {
          tags: ['Users'],
          summary: 'Xóa người dùng',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Xóa thành công' }, 404: { description: 'Không tìm thấy' } },
        },
      },
      // TASKS
      '/api/users/{userId}/tasks': {
        get: {
          tags: ['Tasks'],
          summary: 'Lấy danh sách công việc',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } } } },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Tạo công việc mới',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string', enum: ['THAP', 'TRUNG_BINH', 'CAO'] },
                    status: { type: 'string', enum: ['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'] },
                    categoryId: { type: 'integer' },
                    startDate: { type: 'string', format: 'date-time' },
                    dueDate: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Tạo thành công', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } } },
        },
      },
      '/api/users/{userId}/tasks/{id}': {
        get: {
          tags: ['Tasks'],
          summary: 'Lấy công việc theo ID',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } }, 404: { description: 'Không tìm thấy' } },
        },
        put: {
          tags: ['Tasks'],
          summary: 'Cập nhật công việc',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string', enum: ['THAP', 'TRUNG_BINH', 'CAO'] },
                    status: { type: 'string', enum: ['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'] },
                    categoryId: { type: 'integer' },
                    startDate: { type: 'string', format: 'date-time' },
                    dueDate: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: { 204: { description: 'Cập nhật thành công' }, 404: { description: 'Không tìm thấy' } },
        },
        delete: {
          tags: ['Tasks'],
          summary: 'Chuyển công việc vào thùng rác',
          description: 'Xóa mềm, không đổi trạng thái hoàn thành. Có thể khôi phục trong thùng rác trước khi dữ liệu bị dọn vĩnh viễn.',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Xóa thành công' }, 404: { description: 'Không tìm thấy' } },
        },
      },
      '/api/users/{userId}/tasks/completed/trash': {
        post: {
          tags: ['Tasks'],
          summary: 'Dọn các công việc đã hoàn thành vào thùng rác',
          description: 'Chỉ chủ tài khoản được thực hiện. Chỉ chuyển các ID đã xác nhận còn ở trạng thái HOAN_THANH và chưa xóa. Bỏ qua ID không tồn tại, của người khác, đã đổi trạng thái hoặc đã ở thùng rác; gọi lại không xóa thêm. Không tạo công việc lặp tiếp theo và không xóa vĩnh viễn.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['taskIds'],
                  properties: { taskIds: { type: 'array', minItems: 1, maxItems: 500, items: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } } },
                },
                example: { taskIds: [12, 15, 18] },
              },
            },
          },
          responses: {
            200: {
              description: 'Các công việc phù hợp đã được chuyển vào thùng rác; có thể trả movedCount bằng 0.',
              content: { 'application/json': { schema: {
                type: 'object', required: ['movedCount', 'taskIds'],
                properties: {
                  movedCount: { type: 'integer', minimum: 0 },
                  taskIds: { type: 'array', items: { type: 'integer' } },
                },
              }, example: { movedCount: 2, taskIds: [12, 15] } } },
            },
            400: { description: 'ID người dùng hoặc danh sách taskIds không hợp lệ.' },
            401: { description: 'Chưa đăng nhập, phiên hết hạn hoặc tài khoản không khả dụng.' },
            403: { description: 'Không phải chủ tài khoản trong đường dẫn.' },
            500: { description: 'Lỗi máy chủ; giao dịch dọn công việc không được lưu.' },
          },
        },
      },
      '/api/users/{userId}/tasks/trash': {
        get: {
          tags: ['Tasks'], summary: 'Lấy công việc trong thùng rác',
          description: 'Trước khi trả danh sách, dọn vĩnh viễn các công việc đã ở thùng rác quá 30 ngày. Đây là dọn khi truy cập danh sách, không phải tác vụ chạy đúng giờ nền.',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Danh sách công việc đã xóa mềm.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } } } },
        },
      },
      '/api/users/{userId}/tasks/{id}/restore': {
        post: {
          tags: ['Tasks'], summary: 'Khôi phục công việc từ thùng rác',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Khôi phục thành công, giữ nguyên trạng thái công việc.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } }, 404: { description: 'Không tìm thấy công việc trong thùng rác.' } },
        },
      },
      '/api/users/{userId}/tasks/{id}/permanent': {
        delete: {
          tags: ['Tasks'], summary: 'Xóa vĩnh viễn công việc trong thùng rác',
          description: 'Chỉ áp dụng cho công việc đã được chuyển vào thùng rác. Không thể khôi phục sau thao tác này.',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Đã xóa vĩnh viễn.' }, 404: { description: 'Không tìm thấy công việc trong thùng rác.' } },
        },
      },
      // CATEGORIES
      '/api/users/{userId}/categories': {
        get: {
          tags: ['Categories'],
          summary: 'Lấy danh sách danh mục',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } } },
        },
        post: {
          tags: ['Categories'],
          summary: 'Tạo danh mục mới',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, color: { type: 'string' } } },
              },
            },
          },
          responses: { 201: { description: 'Tạo thành công', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } } },
        },
      },
      '/api/users/{userId}/categories/{id}': {
        get: {
          tags: ['Categories'],
          summary: 'Lấy danh mục theo ID',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, 404: { description: 'Không tìm thấy' } },
        },
        put: {
          tags: ['Categories'],
          summary: 'Cập nhật danh mục',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, color: { type: 'string' } } },
              },
            },
          },
          responses: { 204: { description: 'Cập nhật thành công' }, 404: { description: 'Không tìm thấy' } },
        },
        delete: {
          tags: ['Categories'],
          summary: 'Xóa danh mục',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Xóa thành công' }, 404: { description: 'Không tìm thấy' } },
        },
      },
      // NOTIFICATIONS
      '/api/users/{userId}/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'Lấy danh sách thông báo',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } } },
        },
        post: {
          tags: ['Notifications'],
          summary: 'Tạo thông báo mới',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['tieuDe'], properties: { congViecId: { type: 'integer' }, tieuDe: { type: 'string' }, noiDung: { type: 'string' } } },
              },
            },
          },
          responses: { 201: { description: 'Tạo thành công' } },
        },
      },
      '/api/users/{userId}/notifications/{id}': {
        get: {
          tags: ['Notifications'],
          summary: 'Lấy thông báo theo ID',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } } }, 404: { description: 'Không tìm thấy' } },
        },
        delete: {
          tags: ['Notifications'],
          summary: 'Xóa thông báo',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Xóa thành công' }, 404: { description: 'Không tìm thấy' } },
        },
      },
      '/api/users/{userId}/notifications/{id}/read': {
        patch: {
          tags: ['Notifications'],
          summary: 'Đánh dấu thông báo đã đọc',
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Thành công' }, 404: { description: 'Không tìm thấy' } },
        },
      },
      // REMINDERS
      '/api/tasks/{taskId}/reminders': {
        get: {
          tags: ['Reminders'],
          summary: 'Lấy danh sách nhắc nhở',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Reminder' } } } } } },
        },
        post: {
          tags: ['Reminders'],
          summary: 'Tạo nhắc nhở',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['thoiGianNhac'], properties: { thoiGianNhac: { type: 'string', format: 'date-time' }, loaiNhac: { type: 'string' } } },
              },
            },
          },
          responses: { 201: { description: 'Tạo thành công' } },
        },
      },
      '/api/tasks/{taskId}/reminders/{id}': {
        get: {
          tags: ['Reminders'],
          summary: 'Lấy nhắc nhở theo ID',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Reminder' } } } }, 404: { description: 'Không tìm thấy' } },
        },
        put: {
          tags: ['Reminders'],
          summary: 'Cập nhật nhắc nhở',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { thoiGianNhac: { type: 'string', format: 'date-time' }, loaiNhac: { type: 'string' } } },
              },
            },
          },
          responses: { 204: { description: 'Cập nhật thành công' }, 404: { description: 'Không tìm thấy' } },
        },
        delete: {
          tags: ['Reminders'],
          summary: 'Xóa nhắc nhở',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Xóa thành công' }, 404: { description: 'Không tìm thấy' } },
        },
      },
      // TASK HISTORY
      '/api/tasks/{taskId}/history': {
        get: {
          tags: ['Task History'],
          summary: 'Lấy lịch sử công việc',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TaskHistory' } } } } } },
        },
        post: {
          tags: ['Task History'],
          summary: 'Thêm lịch sử',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { trangThaiCu: { type: 'string' }, trangThaiMoi: { type: 'string' } } },
              },
            },
          },
          responses: { 201: { description: 'Tạo thành công' } },
        },
      },
      '/api/tasks/{taskId}/history/{id}': {
        get: {
          tags: ['Task History'],
          summary: 'Lấy lịch sử theo ID',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskHistory' } } } }, 404: { description: 'Không tìm thấy' } },
        },
        delete: {
          tags: ['Task History'],
          summary: 'Xóa lịch sử',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Xóa thành công' }, 404: { description: 'Không tìm thấy' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = require('./swagger-teams')(swaggerJsdoc(options));
