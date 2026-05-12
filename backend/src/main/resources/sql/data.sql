INSERT INTO app_user (id, username, password, nickname, phone, role, status, points)
VALUES
  (1, 'admin', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '平台管理员', '13800000001', 'admin', 1, 0),
  (2, 'user01', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '张三', '13800000002', 'user', 1, 120),
  (3, 'user02', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '李四', '13800000003', 'user', 1, 80),
  (4, 'merchant01', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '安心家政', '13800000004', 'merchant', 1, 0),
  (5, 'merchant02', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '速修管家', '13800000005', 'merchant', 1, 0);

INSERT INTO merchant (id, user_id, name, logo, phone, address, intro, audit_status, audit_remark, rating, order_count, license, status)
VALUES
  (1, 4, '安心家政', 'https://picsum.photos/200/120?1', '13800000004', '济南市历下区文化东路 1 号', '提供保洁、家政、搬家等上门服务。', '2', '审核通过', 4.80, 18, 'https://picsum.photos/200/120?license1', 1),
  (2, 5, '速修管家', 'https://picsum.photos/200/120?2', '13800000005', '济南市市中区经十路 88 号', '专注家电维修与管道疏通服务。', '2', '审核通过', 4.60, 11, 'https://picsum.photos/200/120?license2', 1);

INSERT INTO category (id, name, icon, sort, status)
VALUES
  (1, '家政服务', 'el-icon-house', 1, 1),
  (2, '保洁服务', 'el-icon-brush', 2, 1),
  (3, '家电维修', 'el-icon-setting', 3, 1),
  (4, '搬家服务', 'el-icon-truck', 4, 1),
  (5, '跑腿配送', 'el-icon-s-promotion', 5, 1),
  (6, '教育培训', 'el-icon-reading', 6, 1);

INSERT INTO service_item (id, merchant_id, category_id, name, price, duration, description, images, tags, sales, status, audit_status, audit_remark)
VALUES
  (1, 1, 2, '全屋深度保洁', 199.00, 180, '适合家庭季度深度清洁，含厨房和卫生间。', 'https://picsum.photos/300/200?service1', '保洁,深度清洁', 15, 1, '2', '审核通过'),
  (2, 1, 4, '同城搬家套餐', 388.00, 240, '含基础打包与搬运，适合中小户型。', 'https://picsum.photos/300/200?service2', '搬家,打包', 8, 1, '2', '审核通过'),
  (3, 2, 3, '空调上门维修', 129.00, 90, '适用于家用壁挂空调故障排查与维修。', 'https://picsum.photos/300/200?service3', '空调,维修', 10, 1, '2', '审核通过'),
  (4, 2, 3, '热水器检修', 99.00, 60, '热水器基础检修与安全排查。', 'https://picsum.photos/300/200?service4', '热水器,维修', 6, 1, '0', '待审核');

INSERT INTO banner (id, title, image_url, link_url, sort, status)
VALUES
  (1, '春季家政特惠', 'https://picsum.photos/1200/320?banner1', '/#/user/services?categoryId=2', 1, 1),
  (2, '空调维修限时折扣', 'https://picsum.photos/1200/320?banner2', '/#/user/services?categoryId=3', 2, 1),
  (3, '同城搬家一口价', 'https://picsum.photos/1200/320?banner3', '/#/user/services?categoryId=4', 3, 1);

INSERT INTO notice (id, title, content, status)
VALUES
  (1, '平台公告：服务时间调整', '五一后平台客服服务时间调整为 08:00-21:00。', 1),
  (2, '商家入驻说明', '新商家入驻请确保上传清晰有效的资质证明材料。', 1);
