// Local OOXML fallback: the artifact runtime and loader are unavailable in this session.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/truon/AppData/Local/OpenAI/Codex/runtimes/cua_node/7d8d3ac5ca9f6767/bin/node_modules/sharp');
const root=path.resolve('.slide-build/package');fs.mkdirSync(root,{recursive:true});
const out=path.resolve('output/BC_Thuyet_trinh_ToDo_List_15_slide.pptx');
const C={ink:'20213B',purple:'554CEC',muted:'606777',bg:'FAFAFD',white:'FFFFFF'};
const slides=[];
function slide(title,notes,bg=C.bg){const s={title,notes,bg,items:[]};slides.push(s);if(title)txt(s,title,64,44,1152,70,44,true);txt(s,String(slides.length).padStart(2,'0'),1175,672,45,25,16,false,C.muted);return s;}
function txt(s,text,x,y,w,h,size=26,bold=false,color=C.ink){s.items.push({type:'text',text,x,y,w,h,size,bold,color});}
function para(s,heading,body,x,y,w){txt(s,heading,x,y,w,38,28,true,C.purple);txt(s,body,x,y+45,w,105,25);}
const assets=JSON.parse(fs.readFileSync('.slide-build/assets.json'));
function pic(s,n,x,y,w,h,alt){const a=assets[n-1];const k=Math.min(w/a.width,h/a.height);s.items.push({type:'image',path:path.resolve(a.path),x:x+(w-a.width*k)/2,y:y+(h-a.height*k)/2,w:a.width*k,h:a.height*k,alt});}
let s=slide('', 'Nguồn: BC.doc, trang bìa.\nGiới thiệu tên đề tài, thành viên và giảng viên hướng dẫn. Đề tài xây dựng ứng dụng quản lý công việc cá nhân, đồng thời hỗ trợ cộng tác nhóm nhỏ.');
pic(s,1,1092,45,118,115,'Logo Trường Đại học Công nghệ Kỹ thuật Hưng Yên');
txt(s,'BÀI TẬP LỚN MÔN LẬP TRÌNH MOBILE ĐA NỀN TẢNG',64,54,965,35,21,true,C.purple);
txt(s,'PHÁT TRIỂN ỨNG DỤNG',64,148,1120,75,58,true);
txt(s,'QUẢN LÝ CÔNG VIỆC\nCÁ NHÂN',64,226,1130,165,64,true);
txt(s,'TO-DO LIST',64,413,1080,60,40,true,C.purple);
txt(s,'Nguyễn Văn Trường  ·  10123341\nTrần Bình Dương  ·  10123072',64,525,600,85,24);
txt(s,'GVHD: ThS. Vũ Xuân Thắng\nLớp: 12523W.1',725,525,500,85,24);
txt(s,'Trường Đại học Công nghệ Kỹ thuật Hưng Yên, 2026',64,658,1060,28,18,false,C.muted);

s=slide('Lý do chọn đề tài','Nguồn: BC.doc, mục 1.1 và Phát biểu bài toán, chương 3.\nKhi nhiệm vụ được lưu rải rác trong sổ tay hoặc tệp riêng, người dùng khó theo dõi thời hạn. Trong nhóm, nhu cầu còn bao gồm xác định người phụ trách và cập nhật kết quả. Ứng dụng tập trung những thao tác này trên thiết bị di động.');
txt(s,'Thông tin rời rạc khiến việc theo dõi\nnhiệm vụ và phối hợp nhóm khó hơn',64,150,1140,110,40,true);
para(s,'Dễ bỏ sót công việc','Nhiều nhiệm vụ có thời hạn\nvà mức ưu tiên khác nhau.',64,328,350);
para(s,'Khó nắm tiến độ','Thiếu một nơi tổng hợp\ntrạng thái thực hiện.',465,328,350);
para(s,'Phân công chưa rõ','Thành viên cần biết nhiệm vụ\nvà trách nhiệm của mình.',866,328,350);
txt(s,'Giải pháp: quản lý công việc cá nhân và nhóm trong cùng một ứng dụng mobile.',64,561,1110,80,28,false,C.purple);

s=slide('Mục tiêu và phạm vi','Nguồn: BC.doc, mục 1.2–1.5.\nMục tiêu là xây dựng một ứng dụng dễ sử dụng, kết nối giao diện, API và dữ liệu. Phạm vi là cá nhân và nhóm nhỏ. Android là môi trường kiểm tra trực tiếp. Khả năng đa nền tảng đến từ công nghệ React Native, không đồng nghĩa đã kiểm thử đầy đủ trên iOS.');
para(s,'Mục tiêu','Tổ chức nhiệm vụ, phân công công việc\nvà theo dõi tiến độ trên điện thoại.',64,160,570);
para(s,'Đối tượng','Người dùng cá nhân và các nhóm nhỏ\ntrong học tập, công việc.',700,160,515);
para(s,'Yêu cầu kỹ thuật','Kết nối giao diện với API và dữ liệu.\nKiểm tra đầu vào và quyền thao tác.',64,385,570);
para(s,'Phạm vi triển khai','Kiểm tra trực tiếp trên Android.\nDữ liệu nghiệp vụ cần kết nối backend.',700,385,515);

s=slide('Công nghệ và kiến trúc hệ thống','Nguồn: BC.doc, mục 2.2, 2.3 và chương 4: Môi trường và công nghệ phát triển, Triển khai ứng dụng.\nJavaScript là ngôn ngữ chính. Mobile gửi yêu cầu qua API, Express xử lý nghiệp vụ và Sequelize truy cập MySQL. AsyncStorage lưu thông tin phiên cùng một số thiết lập cục bộ. Trong phát triển, Android cần kết nối Metro. Bản phát hành đóng gói mã ứng dụng nhưng dữ liệu vẫn cần backend.');
para(s,'Ứng dụng mobile','React Native + Expo\nGiao diện và tương tác',64,176,360);
para(s,'Dịch vụ API','Node.js + Express\nXác thực và xử lý nghiệp vụ',462,176,370);
para(s,'Dữ liệu tập trung','Sequelize + MySQL\nTruy xuất và lưu trữ dữ liệu',860,176,355);
txt(s,'JavaScript',64,410,530,52,36,true,C.purple);
txt(s,'Ngôn ngữ chính ở mobile và backend.',64,477,530,95,27);
txt(s,'AsyncStorage',700,410,515,52,36,true,C.purple);
txt(s,'Lưu thông tin phiên và thiết lập cục bộ.',700,477,515,95,27);
txt(s,'Mobile trao đổi dữ liệu với backend qua API theo mô hình client–server.',64,607,1150,45,24,false,C.muted);

s=slide('Tác nhân và nhóm chức năng','Nguồn: BC.doc, mục Đặc tả yêu cầu phần mềm, Hình 3-1 và chương 4 mục 4.2.4–4.2.6.\nUse Case tổng quát có User và Admin. Trưởng nhóm là vai trò trong từng nhóm, có trách nhiệm quản lý thành viên và phân công nhiệm vụ. Chức năng quản trị tài khoản có giao diện riêng, còn phân quyền nâng cao vẫn là hướng phát triển.');
pic(s,2,64,160,745,460,'Biểu đồ Use Case tổng quát trong báo cáo');
para(s,'Người dùng','Tài khoản, công việc cá nhân,\nnhóm và theo dõi tiến độ.',852,160,363);
para(s,'Trưởng nhóm','Quản lý thành viên và\nphân công nhiệm vụ.',852,335,363);
para(s,'Quản trị viên','Quản lý tài khoản người dùng\ntrong khu vực quản trị.',852,510,363);

s=slide('Thiết kế cơ sở dữ liệu','Nguồn: BC.doc, mục 3.2.3, Hình 3-7 và mục Triển khai cơ sở dữ liệu.\nMô hình liên kết tài khoản với công việc, danh mục và nhóm. Bảng thành viên xác định người tham gia và vai trò. Công việc nhóm gắn người giao và người nhận. Backend dùng Sequelize, migration cho thay đổi cấu trúc và giao dịch khi nhiều bản ghi cần nhất quán. Các bảng nhắc nhở trong thiết kế không chứng minh chức năng thông báo đã hoàn thiện.');
pic(s,8,650,130,565,516,'Mô hình cơ sở dữ liệu quan hệ trích từ báo cáo');
para(s,'Nghiệp vụ cá nhân','Người dùng, danh mục và công việc\nliên kết bằng khóa chính, khóa ngoại.',64,166,550);
para(s,'Nghiệp vụ nhóm','Nhóm, thành viên và công việc nhóm\nthể hiện người tham gia, người phụ trách.',64,340,550);
para(s,'Tính nhất quán','Sequelize quản lý truy xuất.\nMigration cập nhật cấu trúc dữ liệu.',64,514,550);

s=slide('Luồng xử lý thêm công việc','Nguồn: BC.doc, Bảng 3-6 và Hình 3-9.\nNgười dùng mở biểu mẫu, nhập tiêu đề, mô tả, thời hạn và ưu tiên. Khi lưu, hệ thống kiểm tra dữ liệu và gửi yêu cầu xử lý. Nếu dữ liệu hợp lệ, backend lưu và trả kết quả để cập nhật danh sách. Cần phản hồi rõ khi thiếu thông tin, dữ liệu sai hoặc lỗi lưu trữ.');
pic(s,10,80,134,1120,426,'Biểu đồ tuần tự chức năng thêm công việc');
txt(s,'Nhập thông tin',64,574,350,40,28,true,C.purple);
txt(s,'Kiểm tra và lưu dữ liệu',455,574,405,40,28,true,C.purple);
txt(s,'Phản hồi kết quả',910,574,305,40,28,true,C.purple);
txt(s,'Thiếu dữ liệu hoặc lỗi lưu trữ: hiển thị thông báo để người dùng xử lý.',64,630,1115,35,23,false,C.muted);

s=slide('Đăng ký, đăng nhập và hồ sơ','Nguồn: BC.doc, mục 4.2.1–4.2.2, ảnh tại mục 3.3.1, 3.3.2 và 3.3.7.\nỨng dụng kiểm tra thông tin khi đăng ký, đăng nhập và thiết lập phiên làm việc. Mật khẩu lưu dưới dạng băm. Người dùng chỉnh sửa hồ sơ và đổi mật khẩu trong phạm vi tài khoản của mình. Các ảnh minh họa lần lượt là đăng nhập, đăng ký và cá nhân.');
para(s,'Quản lý tài khoản','Đăng ký, đăng nhập\nvà thiết lập phiên làm việc.',64,170,380);
para(s,'Bảo vệ thông tin','Lưu mật khẩu dạng băm.\nKiểm tra dữ liệu tại backend.',64,350,380);
para(s,'Hồ sơ cá nhân','Cập nhật thông tin\nvà thay đổi mật khẩu.',64,530,380);
pic(s,15,489,163,219,448,'Giao diện đăng nhập');pic(s,16,738,150,219,478,'Giao diện đăng ký');pic(s,21,987,150,219,478,'Giao diện hồ sơ cá nhân');
txt(s,'Đăng nhập',489,638,219,28,19,true,C.muted);txt(s,'Đăng ký',738,638,219,28,19,true,C.muted);txt(s,'Hồ sơ',987,638,219,28,19,true,C.muted);

s=slide('Quản lý công việc cá nhân','Nguồn: BC.doc, Bảng 3-5, Bảng 3-6, mục 4.2.3 và ảnh giao diện công việc tại mục 3.3.4.\nNgười dùng tạo, sửa, xóa công việc, gán thời hạn và mức ưu tiên. Công việc có các trạng thái chưa làm, đang làm, hoàn thành. Danh sách hoặc bảng giúp theo dõi nhiệm vụ. Báo cáo cũng mô tả thùng rác để xử lý công việc đã xóa.');
pic(s,18,826,137,330,518,'Danh sách công việc cá nhân');
para(s,'Tạo và tổ chức nhiệm vụ','Tiêu đề, mô tả, danh mục, thời hạn\nvà mức độ ưu tiên.',64,168,710);
para(s,'Cập nhật tiến độ','Chưa làm, đang làm, hoàn thành.\nTheo dõi qua danh sách hoặc bảng.',64,337,710);
para(s,'Tìm kiếm và xử lý công việc','Tìm kiếm, lọc danh sách và chỉnh sửa.\nThùng rác hỗ trợ quản lý mục đã xóa.',64,506,710);

s=slide('Cộng tác và phân công trong nhóm','Nguồn: BC.doc, mục 4.2.4–4.2.6 và ảnh khu vực nhóm trong mục 3.3.6.\nTrong báo cáo, dự án được dùng để chỉ nhóm công việc. Người tạo nhóm giữ vai trò trưởng nhóm, quản lý thành viên và giao việc. Backend kiểm tra thành viên và vai trò trước khi cho phép thay đổi. Ảnh minh họa thể hiện trưởng nhóm, thành viên và các thao tác quản lý nhóm.');
pic(s,20,830,137,326,518,'Giao diện thành viên và quản lý nhóm');
para(s,'Không gian làm việc chung','Mỗi nhóm có thông tin, thành viên\nvà danh sách nhiệm vụ riêng.',64,168,705);
para(s,'Trưởng nhóm phân công','Tạo nhiệm vụ, lựa chọn người nhận\nvà quản lý danh sách thành viên.',64,337,705);
para(s,'Quyền gắn với từng nhóm','Backend kiểm tra vai trò và thành viên\ntrước khi cho phép thao tác.',64,506,705);

s=slide('Lịch công việc và theo dõi tiến độ','Nguồn: BC.doc, mục 4.2.3, 4.2.7 và ảnh tại mục 3.3.3, 3.3.5.\nLịch cho phép xem nhiệm vụ theo ngày, còn trang chủ hiển thị tình hình công việc. Các số trong ảnh chỉ là dữ liệu giao diện minh họa, không phải kết quả đánh giá hiệu quả. Phần thống kê hiện mang tính tổng quan, chưa có báo cáo chuyên sâu.');
para(s,'Theo dõi thời hạn','Xem công việc theo ngày\ntrên lịch của ứng dụng.',64,190,495);
para(s,'Nắm tình hình thực hiện','Tổng hợp số lượng và trạng thái.\nTìm nhanh công việc cần xử lý.',64,388,495);
txt(s,'Thống kê hiện ở mức tổng quan.',64,593,520,60,25,false,C.muted);
pic(s,19,630,140,260,520,'Giao diện lịch công việc');pic(s,17,932,140,260,520,'Trang chủ hiển thị tiến độ và công việc');

s=slide('Giao diện quản trị tài khoản','Nguồn: BC.doc, Bảng 3-1, Bảng 3-2, mục 3.3.8–3.3.9 và Hình 3-22.\nUse Case quản lý người dùng gồm xem danh sách, thêm, sửa và xóa tài khoản. Luồng xóa có xác nhận. Hệ thống phản hồi khi dữ liệu sai, email trùng hoặc không tìm thấy người dùng. Đây là khu vực quản trị tài khoản, chưa đồng nghĩa có phân quyền nâng cao hoàn chỉnh cho Admin, Manager và User.');
pic(s,23,66,149,1148,430,'Giao diện quản lý tài khoản người dùng');
txt(s,'Danh sách người dùng',64,605,370,45,27,true,C.purple);
txt(s,'Thêm và sửa thông tin',458,605,390,45,27,true,C.purple);
txt(s,'Xác nhận trước khi xóa',864,605,355,45,27,true,C.purple);

s=slide('Kiểm thử ứng dụng','Nguồn: BC.doc, mục 4.5.1–4.5.3.\nKiểm thử gồm chức năng, dữ liệu và giao diện. Với thao tác liên quan tài khoản hoặc nhóm, cần kiểm tra cả quyền truy cập. Với dữ liệu, cần xem xét tính nhất quán khi giao dịch thành công và khi có lỗi. Thao tác trực tiếp trên Android hỗ trợ phát hiện vấn đề về bố cục, nội dung dài và trạng thái tải.');
para(s,'Chức năng','Luồng hợp lệ, dữ liệu sai,\nthiếu quyền và lỗi kết nối.',64,182,350);
para(s,'Dữ liệu','Tạo, sửa, xóa và quan hệ bảng.\nGiao dịch, migration thử nghiệm.',465,182,350);
para(s,'Giao diện Android','Danh sách rỗng, nội dung dài,\nđang tải và thông báo lỗi.',866,182,350);
txt(s,'Kiểm tra xuyên suốt từ thao tác\ntrên mobile đến dữ liệu tại backend',64,430,1150,130,42,true);
txt(s,'Kết hợp kiểm thử mã nguồn với thao tác trực tiếp trên ứng dụng.',64,604,1120,45,26,false,C.muted);

s=slide('Kết quả đạt được và hạn chế','Nguồn: BC.doc, Kết luận: Kết quả đạt được và Những hạn chế của đề tài.\nKết quả là ứng dụng Android quản lý công việc cá nhân và nhóm, kết nối backend MySQL. Hạn chế gồm phụ thuộc mạng, chưa hỗ trợ đầy đủ offline và thời gian thực, chưa tích hợp nhắc việc bằng notification, phân quyền nâng cao và trải nghiệm cần hoàn thiện.');
txt(s,'Kết quả đạt được',64,166,550,48,34,true,C.purple);
txt(s,'Ứng dụng quản lý công việc trên Android.\n\nHỗ trợ nhiệm vụ cá nhân, nhóm\nvà theo dõi tiến độ.\n\nKết nối mobile, API và MySQL.',64,240,548,337,27);
txt(s,'Hạn chế hiện tại',700,166,515,48,34,true,C.purple);
txt(s,'Phụ thuộc kết nối mạng.\n\nChưa đầy đủ offline và thời gian thực.\n\nChưa tích hợp thông báo nhắc việc.\n\nPhân quyền nâng cao và UI/UX\ncần tiếp tục hoàn thiện.',700,240,515,370,26);

s=slide('Hướng phát triển','Nguồn: BC.doc, Kết luận: Hướng phát triển của đề tài.\nCác hướng tiếp theo gồm cập nhật dữ liệu theo thời gian thực, xử lý nhiều người dùng đồng thời, tích hợp thông báo nhắc việc, phân quyền chi tiết và nâng cấp UI/UX. Có thể mở rộng thống kê, báo cáo và chia sẻ công việc. Kết thúc phần trình bày và mời giảng viên góp ý.');
para(s,'Hoàn thiện chức năng','Thông báo nhắc việc và cập nhật\ndữ liệu theo thời gian thực.',64,164,550);
para(s,'Mở rộng phân quyền','Quyền chi tiết cho Admin,\nManager và User.',700,164,515);
para(s,'Cải thiện trải nghiệm','Tối ưu UI/UX theo Material Design,\nnâng cấp thống kê và báo cáo.',64,373,550);
para(s,'Tăng khả năng cộng tác','Cải thiện xử lý đồng thời\nvà chia sẻ công việc.',700,373,515);
txt(s,'CẢM ƠN THẦY CÔ ĐÃ LẮNG NGHE',64,602,1130,52,34,true,C.purple);

const esc=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const emu=v=>Math.round(v*9525);
const write=(p,t)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,t)};
const P='http://schemas.openxmlformats.org/presentationml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const head='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const rels=a=>head+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${a.map(([id,type,target])=>`<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`).join('')}</Relationships>`;
const group='<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const xfrm=o=>`<a:xfrm><a:off x="${emu(o.x)}" y="${emu(o.y)}"/><a:ext cx="${emu(o.w)}" cy="${emu(o.h)}"/></a:xfrm>`;
function textXML(o,id){return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(o.text.split('\n')[0])}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(o)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="none" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/>${o.text.split('\n').map(line=>`<a:p><a:pPr><a:lnSpc><a:spcPts val="${Math.round(o.size*.75*1.28*100)}"/></a:lnSpc><a:buNone/></a:pPr><a:r><a:rPr lang="vi-VN" sz="${o.size*75}" b="${o.bold?1:0}"><a:solidFill><a:srgbClr val="${o.color}"/></a:solidFill><a:latin typeface="Arial"/><a:ea typeface="Arial"/><a:cs typeface="Arial"/></a:rPr><a:t>${esc(line)}</a:t></a:r><a:endParaRPr lang="vi-VN" sz="${o.size*75}"/></a:p>`).join('')}</p:txBody></p:sp>`;}
let media=0;const manifest=[];
for(let i=0;i<slides.length;i++){
 const s=slides[i];let xml='',svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="720"><rect width="1280" height="720" fill="#${s.bg}"/>`;let rr=[['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','notesSlide',`../notesSlides/notesSlide${i+1}.xml`]];let rid=3,id=2;
 for(const o of s.items){
  if(o.type==='text'){
   xml+=textXML(o,id++);
   svg+=o.text.split('\n').map((t,j)=>`<text x="${o.x}" y="${o.y+o.size*.93+j*o.size*1.28}" font-family="Arial" font-size="${o.size}" font-weight="${o.bold?700:400}" fill="#${o.color}">${esc(t)}</text>`).join('');
  }else{
   const name=`image${++media}.png`;fs.mkdirSync(path.join(root,'ppt/media'),{recursive:true});fs.copyFileSync(o.path,path.join(root,'ppt/media',name));rr.push([`rId${rid}`,'image',`../media/${name}`]);
   xml+=`<p:pic><p:nvPicPr><p:cNvPr id="${id++}" name="${esc(o.alt)}" descr="${esc(o.alt)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId${rid++}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(o)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
   svg+=`<image x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" xlink:href="data:image/png;base64,${fs.readFileSync(o.path).toString('base64')}"/>`;
  }
 }
 write(`ppt/slides/slide${i+1}.xml`,head+`<p:sld xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${s.bg}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${xml}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
 write(`ppt/slides/_rels/slide${i+1}.xml.rels`,rels(rr));
 const note={text:s.notes,x:0,y:0,w:700,h:450,size:14,bold:false,color:C.ink};
 write(`ppt/notesSlides/notesSlide${i+1}.xml`,head+`<p:notes xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:spTree>${group}${textXML(note,2).replace('<p:nvPr/>','<p:nvPr><p:ph type="body" idx="1"/></p:nvPr>')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`);
 write(`ppt/notesSlides/_rels/notesSlide${i+1}.xml.rels`,rels([['rId1','slide',`../slides/slide${i+1}.xml`],['rId2','notesMaster','../notesMasters/notesMaster1.xml']]));
 await sharp(Buffer.from(svg+'</svg>')).png().toFile(`.slide-build/slide-${String(i+1).padStart(2,'0')}.png`);
 manifest.push({slide:i+1,title:s.title,items:s.items});
}
const clr='<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>';
write('ppt/slideMasters/slideMaster1.xml',head+`<p:sldMaster xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld name="To Do List"><p:spTree>${group}</p:spTree></p:cSld>${clr}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`);
write('ppt/slideMasters/_rels/slideMaster1.xml.rels',rels([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','theme','../theme/theme1.xml']]));
write('ppt/slideLayouts/slideLayout1.xml',head+`<p:sldLayout xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
write('ppt/slideLayouts/_rels/slideLayout1.xml.rels',rels([['rId1','slideMaster','../slideMasters/slideMaster1.xml']]));
write('ppt/notesMasters/notesMaster1.xml',head+`<p:notesMaster xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:spTree>${group}</p:spTree></p:cSld>${clr}<p:notesStyle/></p:notesMaster>`);
write('ppt/notesMasters/_rels/notesMaster1.xml.rels',rels([['rId1','theme','../theme/theme1.xml']]));
const themeColors={dk1:C.ink,lt1:'FFFFFF',dk2:'34364C',lt2:C.bg,accent1:C.purple,accent2:'18A999',accent3:'F1B24A',accent4:'6D83F2',accent5:'AF80DF',accent6:'8298AD',hlink:C.purple,folHlink:'954F72'};
const fill='<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
write('ppt/theme/theme1.xml',head+`<a:theme xmlns:a="${A}" name="TaskMaster"><a:themeElements><a:clrScheme name="TaskMaster">${Object.entries(themeColors).map(([k,v])=>`<a:${k}><a:srgbClr val="${v}"/></a:${k}>`).join('')}</a:clrScheme><a:fontScheme name="Arial"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Simple"><a:fillStyleLst>${fill.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${[6350,12700,19050].map(w=>`<a:ln w="${w}">${fill}<a:prstDash val="solid"/></a:ln>`).join('')}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${fill.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
write('ppt/presentation.xml',head+`<p:presentation xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>${slides.map((s,i)=>`<p:sldId id="${256+i}" r:id="rId${3+i}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`);
write('ppt/_rels/presentation.xml.rels',rels([['rId1','slideMaster','slideMasters/slideMaster1.xml'],['rId2','notesMaster','notesMasters/notesMaster1.xml'],...slides.map((s,i)=>[`rId${3+i}`,'slide',`slides/slide${i+1}.xml`])]));
write('_rels/.rels',rels([['rId1','officeDocument','ppt/presentation.xml']]));
const overrides=[['ppt/presentation.xml','presentation'],['ppt/slideMasters/slideMaster1.xml','slideMaster'],['ppt/slideLayouts/slideLayout1.xml','slideLayout'],['ppt/notesMasters/notesMaster1.xml','notesMaster'],...slides.flatMap((s,i)=>[[`ppt/slides/slide${i+1}.xml`,'slide'],[`ppt/notesSlides/notesSlide${i+1}.xml`,'notesSlide']])];
write('[Content_Types].xml',head+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${overrides.map(([p,t])=>`<Override PartName="/${p}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.${t==='presentation'?'presentation.main':t}+xml"/>`).join('')}</Types>`);
fs.writeFileSync('.slide-build/manifest.json',JSON.stringify(manifest,null,2));
execFileSync('python',['-c',"import sys,zipfile,pathlib; root=pathlib.Path(sys.argv[1]); z=zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED); [z.write(p,p.relative_to(root).as_posix()) for p in root.rglob('*') if p.is_file()]; z.close()",root,out]);
console.log(JSON.stringify({output:out,slides:slides.length,images:media}));
