const string = { type: 'string' };
const integer = { type: 'integer', minimum: 1 };
const nullableText = { type: 'string', nullable: true };
const user = { type: 'object', properties: { id: integer, tenDangNhap: string, email: string, hoTen: nullableText } };
const member = { type: 'object', properties: {
  id: integer, nhomId: integer, nguoiDungId: integer,
  vaiTro: { type: 'string', enum: ['TRUONG_NHOM', 'THANH_VIEN'] },
  ngayThamGia: { type: 'string', format: 'date-time' }, nguoiDung: user,
} };
const team = { type: 'object', properties: {
  id: integer, tenNhom: string, moTa: nullableText, truongNhomId: integer,
  ngayTao: { type: 'string', format: 'date-time' }, truongNhom: user,
  thanhViens: { type: 'array', items: member },
} };
const attachments = { type: 'array', maxItems: 10, items: {
  type: 'object', required: ['url', 'filename', 'mimetype', 'size'], properties: {
    url: { type: 'string', maxLength: 2048, description: 'HTTP(S) URL hoặc đường dẫn /uploads/...' },
    filename: { type: 'string', maxLength: 255 }, mimetype: { type: 'string', maxLength: 100 },
    size: { type: 'integer', minimum: 0 },
  },
} };
const taskFields = {
  tieuDe: { type: 'string', minLength: 1, maxLength: 200 }, moTa: { ...nullableText, maxLength: 10000 },
  mucDoUuTien: { type: 'string', enum: ['THAP', 'TRUNG_BINH', 'CAO'] },
  hanHoanThanh: { type: 'string', format: 'date-time', nullable: true },
  nguoiNhanId: { ...integer, nullable: true }, fileDinhKem: attachments,
};
const status = { type: 'string', enum: ['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'] };
const task = { type: 'object', properties: {
  ...taskFields, id: integer, nhomId: integer, nguoiGiaoId: integer, trangThai: status,
  nguoiGiao: user, nguoiNhan: { ...user, nullable: true },
  ngayTao: { type: 'string', format: 'date-time' }, ngayCapNhat: { type: 'string', format: 'date-time' },
} };
const groupFields = { tenNhom: { type: 'string', minLength: 1, maxLength: 100 }, moTa: { ...nullableText, maxLength: 10000 } };
const json = schema => ({ 'application/json': { schema } });
const ref = name => ({ $ref: `#/components/schemas/${name}` });
function operation(summary, parameters = [], fields, required = [], code = 204, response) {
  return {
    tags: ['Teams'], summary, security: [{ bearerAuth: [] }],
    parameters: parameters.map(name => ({ name, in: 'path', required: true, schema: integer,
      ...(name === 'memberId' ? { description: 'ID người dùng (nguoiDungId), không phải ID bản ghi thành viên.' } : {}),
    })),
    ...(fields ? { requestBody: { required: true, content: json({ type: 'object', required, properties: fields }) } } : {}),
    responses: {
      [code]: { description: 'Thành công', ...(response ? { content: json(response) } : {}) },
      400: { description: 'Dữ liệu không hợp lệ' }, 401: { description: 'Thiếu token, token hết hạn hoặc tài khoản bị khóa' },
      403: { description: 'Không đủ quyền / userId không khớp phiên đăng nhập' },
      404: { description: 'Không tìm thấy nhóm, thành viên hoặc công việc' },
      409: { description: 'Thành viên đã có trong nhóm' },
    },
  };
}

module.exports = function addTeamsDocs(spec) {
  spec.components.securitySchemes = { ...spec.components.securitySchemes, bearerAuth: { type: 'http', scheme: 'bearer', description: 'accessToken trả về từ POST /api/auth/login, hiệu lực 24 giờ.' } };
  Object.assign(spec.components.schemas, { Team: team, TeamMember: member, TeamTask: task });
  spec.paths['/api/auth/login'].post.responses[200].content = json({
    allOf: [ref('User'), { type: 'object', properties: {
      accessToken: string, tokenType: { type: 'string', enum: ['Bearer'] }, expiresAt: { type: 'string', format: 'date-time' },
    } }],
  });
  spec.paths['/api/auth/logout'] = { post: { ...operation('Thu hồi phiên đăng nhập hiện tại'), tags: ['Auth'] } };
  Object.assign(spec.paths, {
    '/api/teams': {
      get: operation('Danh sách nhóm của tài khoản đang đăng nhập', [], null, [], 200, { type: 'array', items: ref('Team') }),
      post: operation('Tạo nhóm, tự động trở thành trưởng nhóm', [], groupFields, ['tenNhom'], 201, ref('Team')),
    },
    '/api/teams/{teamId}': {
      get: operation('Chi tiết nhóm và thành viên (chỉ thành viên)', ['teamId'], null, [], 200, ref('Team')),
      put: operation('Sửa nhóm (trưởng nhóm)', ['teamId'], groupFields, ['tenNhom']),
      delete: operation('Xóa nhóm cùng công việc và thành viên (trưởng nhóm)', ['teamId']),
    },
    '/api/teams/{teamId}/invite': { post: {
      ...operation('Thêm tài khoản có sẵn bằng email (trưởng nhóm)', ['teamId'], { inviteEmail: { type: 'string', format: 'email' } }, ['inviteEmail'], 201, ref('TeamMember')),
      description: 'Thêm trực tiếp vào nhóm. Không gửi email và chưa có bước chấp nhận/từ chối lời mời.',
    } },
    '/api/teams/{teamId}/transfer-leader': { post: operation('Chuyển quyền cho thành viên đang hoạt động (trưởng nhóm)', ['teamId'], { newLeaderId: integer }, ['newLeaderId'], 200, { type: 'object', properties: { message: string } }) },
    '/api/teams/{teamId}/members/{memberId}': { delete: operation('Xóa thành viên, bỏ phân công các việc của thành viên đó (trưởng nhóm)', ['teamId', 'memberId']) },
    '/api/teams/{teamId}/leave': { delete: operation('Rời nhóm; trưởng nhóm phải chuyển quyền trước', ['teamId']) },
    '/api/teams/{teamId}/tasks': {
      get: operation('Danh sách công việc của nhóm (thành viên)', ['teamId'], null, [], 200, { type: 'array', items: ref('TeamTask') }),
      post: operation('Tạo và giao công việc cho thành viên (trưởng nhóm)', ['teamId'], taskFields, ['tieuDe'], 201, ref('TeamTask')),
    },
    '/api/teams/{teamId}/tasks/{taskId}': {
      put: operation('Sửa các trường được gửi, hoặc phân công lại (trưởng nhóm)', ['teamId', 'taskId'], taskFields),
      delete: operation('Xóa công việc (trưởng nhóm)', ['teamId', 'taskId']),
    },
    '/api/teams/{teamId}/tasks/{taskId}/status': { patch: operation('Cập nhật trạng thái (trưởng nhóm hoặc người nhận việc)', ['teamId', 'taskId'], { trangThai: status }, ['trangThai']) },
  });
  return spec;
};
