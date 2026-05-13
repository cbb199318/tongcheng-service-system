INSERT INTO app_user (id, username, password, nickname, phone, role, status, points)
SELECT 1, 'admin', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '平台管理员', '13800000001', 'admin', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'admin');

INSERT INTO app_user (id, username, password, nickname, phone, role, status, points)
SELECT 2, 'user01', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '张三', '13800000002', 'user', 1, 120
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'user01');

INSERT INTO app_user (id, username, password, nickname, phone, role, status, points)
SELECT 3, 'user02', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '李四', '13800000003', 'user', 1, 80
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'user02');

INSERT INTO app_user (id, username, password, nickname, phone, role, status, points)
SELECT 4, 'merchant01', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '安心家政', '13800000004', 'merchant', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'merchant01');

INSERT INTO app_user (id, username, password, nickname, phone, role, status, points)
SELECT 5, 'merchant02', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '速修管家', '13800000005', 'merchant', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'merchant02');

INSERT INTO app_user (id, username, password, nickname, phone, role, status, points)
SELECT 6, 'merchant03', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '优选到家', '13800000006', 'user', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'merchant03');

INSERT INTO app_user (id, username, password, nickname, phone, role, status, points)
SELECT 7, 'merchant04', '$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG', '闪修生活', '13800000007', 'user', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'merchant04');

INSERT INTO merchant (id, user_id, name, logo, phone, address, intro, audit_status, audit_remark, rating, order_count, license, status)
SELECT 1, 4, '安心家政', '/upload/demo/merchant-1-logo.svg', '13800000004', '济南市历下区文化东路 1 号',
       '提供保洁、家政、搬家等上门服务。', '2', '审核通过', 4.80, 18, '/upload/demo/merchant-1-license.svg', 1
WHERE NOT EXISTS (SELECT 1 FROM merchant WHERE id = 1);

INSERT INTO merchant (id, user_id, name, logo, phone, address, intro, audit_status, audit_remark, rating, order_count, license, status)
SELECT 2, 5, '速修管家', '/upload/demo/merchant-2-logo.svg', '13800000005', '济南市市中区经十路 88 号',
       '专注家电维修与管道疏通服务。', '2', '审核通过', 4.60, 11, '/upload/demo/merchant-2-license.svg', 1
WHERE NOT EXISTS (SELECT 1 FROM merchant WHERE id = 2);

INSERT INTO merchant (id, user_id, name, logo, phone, address, intro, audit_status, audit_remark, rating, order_count, license, status)
SELECT 3, 6, '优选到家', '/upload/demo/merchant-1-logo.svg', '13800000006', '济南市槐荫区经七路 66 号',
       '申请入驻中的综合生活服务商家，用于后台待审核演示。', '0', '待审核', 0.00, 0, '/upload/demo/merchant-1-license.svg', 1
WHERE NOT EXISTS (SELECT 1 FROM merchant WHERE id = 3);

INSERT INTO merchant (id, user_id, name, logo, phone, address, intro, audit_status, audit_remark, rating, order_count, license, status)
SELECT 4, 7, '闪修生活', '/upload/demo/merchant-2-logo.svg', '13800000007', '济南市高新区工业南路 99 号',
       '曾提交资料但被驳回的演示商家，用于后台已驳回场景。', '1', '资质照片不清晰，请重新上传营业资质。', 0.00, 0, '/upload/demo/merchant-2-license.svg', 1
WHERE NOT EXISTS (SELECT 1 FROM merchant WHERE id = 4);

UPDATE merchant
SET logo = '/upload/demo/merchant-1-logo.svg',
    license = '/upload/demo/merchant-1-license.svg'
WHERE id = 1
  AND ((logo IS NULL OR logo = '' OR logo LIKE 'https://picsum.photos/%')
    OR (license IS NULL OR license = '' OR license LIKE 'https://picsum.photos/%'));

UPDATE merchant
SET logo = '/upload/demo/merchant-2-logo.svg',
    license = '/upload/demo/merchant-2-license.svg'
WHERE id = 2
  AND ((logo IS NULL OR logo = '' OR logo LIKE 'https://picsum.photos/%')
    OR (license IS NULL OR license = '' OR license LIKE 'https://picsum.photos/%'));

UPDATE merchant
SET logo = '/upload/demo/merchant-1-logo.svg',
    license = '/upload/demo/merchant-1-license.svg'
WHERE id = 3
  AND ((logo IS NULL OR logo = '' OR logo LIKE 'https://picsum.photos/%')
    OR (license IS NULL OR license = '' OR license LIKE 'https://picsum.photos/%'));

UPDATE merchant
SET logo = '/upload/demo/merchant-2-logo.svg',
    license = '/upload/demo/merchant-2-license.svg'
WHERE id = 4
  AND ((logo IS NULL OR logo = '' OR logo LIKE 'https://picsum.photos/%')
    OR (license IS NULL OR license = '' OR license LIKE 'https://picsum.photos/%'));

INSERT INTO category (id, name, icon, sort, status)
SELECT 1, '家政服务', 'el-icon-house', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM category WHERE id = 1);

INSERT INTO category (id, name, icon, sort, status)
SELECT 2, '保洁服务', 'el-icon-brush', 2, 1
WHERE NOT EXISTS (SELECT 1 FROM category WHERE id = 2);

INSERT INTO category (id, name, icon, sort, status)
SELECT 3, '家电维修', 'el-icon-setting', 3, 1
WHERE NOT EXISTS (SELECT 1 FROM category WHERE id = 3);

INSERT INTO category (id, name, icon, sort, status)
SELECT 4, '搬家服务', 'el-icon-truck', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM category WHERE id = 4);

INSERT INTO category (id, name, icon, sort, status)
SELECT 5, '跑腿配送', 'el-icon-s-promotion', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM category WHERE id = 5);

INSERT INTO category (id, name, icon, sort, status)
SELECT 6, '教育培训', 'el-icon-reading', 6, 1
WHERE NOT EXISTS (SELECT 1 FROM category WHERE id = 6);

INSERT INTO service_item (id, merchant_id, category_id, name, price, duration, description, images, tags, sales, status, audit_status, audit_remark)
SELECT 1, 1, 2, '全屋深度保洁', 199.00, 180, '适合家庭季度深度清洁，含厨房和卫生间。',
       '/upload/demo/service-1.svg', '保洁,深度清洁', 15, 1, '2', '审核通过'
WHERE NOT EXISTS (SELECT 1 FROM service_item WHERE id = 1);

INSERT INTO service_item (id, merchant_id, category_id, name, price, duration, description, images, tags, sales, status, audit_status, audit_remark)
SELECT 2, 1, 4, '同城搬家套餐', 388.00, 240, '含基础打包与搬运，适合中小户型。',
       '/upload/demo/service-2.svg', '搬家,打包', 8, 1, '2', '审核通过'
WHERE NOT EXISTS (SELECT 1 FROM service_item WHERE id = 2);

INSERT INTO service_item (id, merchant_id, category_id, name, price, duration, description, images, tags, sales, status, audit_status, audit_remark)
SELECT 3, 2, 3, '空调上门维修', 129.00, 90, '适用于家用壁挂空调故障排查与维修。',
       '/upload/demo/service-3.svg', '空调,维修', 10, 1, '2', '审核通过'
WHERE NOT EXISTS (SELECT 1 FROM service_item WHERE id = 3);

INSERT INTO service_item (id, merchant_id, category_id, name, price, duration, description, images, tags, sales, status, audit_status, audit_remark)
SELECT 4, 2, 3, '热水器检修', 99.00, 60, '热水器基础检修与安全排查。',
       '/upload/demo/service-4.svg', '热水器,维修', 6, 1, '0', '待审核'
WHERE NOT EXISTS (SELECT 1 FROM service_item WHERE id = 4);

UPDATE service_item
SET images = '/upload/demo/service-1.svg'
WHERE id = 1
  AND (images IS NULL OR images = '' OR images LIKE 'https://picsum.photos/%');

UPDATE service_item
SET images = '/upload/demo/service-2.svg'
WHERE id = 2
  AND (images IS NULL OR images = '' OR images LIKE 'https://picsum.photos/%');

UPDATE service_item
SET images = '/upload/demo/service-3.svg'
WHERE id = 3
  AND (images IS NULL OR images = '' OR images LIKE 'https://picsum.photos/%');

UPDATE service_item
SET images = '/upload/demo/service-4.svg'
WHERE id = 4
  AND (images IS NULL OR images = '' OR images LIKE 'https://picsum.photos/%');

INSERT INTO banner (id, title, image_url, link_url, sort, status)
SELECT 1, '春季家政特惠', '/upload/demo/banner-1.svg', '/#/user/services?categoryId=2', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM banner WHERE id = 1);

INSERT INTO banner (id, title, image_url, link_url, sort, status)
SELECT 2, '空调维修限时折扣', '/upload/demo/banner-2.svg', '/#/user/services?categoryId=3', 2, 1
WHERE NOT EXISTS (SELECT 1 FROM banner WHERE id = 2);

INSERT INTO banner (id, title, image_url, link_url, sort, status)
SELECT 3, '同城搬家一口价', '/upload/demo/banner-3.svg', '/#/user/services?categoryId=4', 3, 1
WHERE NOT EXISTS (SELECT 1 FROM banner WHERE id = 3);

UPDATE banner
SET image_url = '/upload/demo/banner-1.svg'
WHERE id = 1
  AND (image_url IS NULL OR image_url = '' OR image_url LIKE 'https://picsum.photos/%');

UPDATE banner
SET image_url = '/upload/demo/banner-2.svg'
WHERE id = 2
  AND (image_url IS NULL OR image_url = '' OR image_url LIKE 'https://picsum.photos/%');

UPDATE banner
SET image_url = '/upload/demo/banner-3.svg'
WHERE id = 3
  AND (image_url IS NULL OR image_url = '' OR image_url LIKE 'https://picsum.photos/%');

INSERT INTO notice (id, title, content, status)
SELECT 1, '平台公告：服务时间调整', '五一后平台客服服务时间调整为 08:00-21:00。', 1
WHERE NOT EXISTS (SELECT 1 FROM notice WHERE id = 1);

INSERT INTO notice (id, title, content, status)
SELECT 2, '商家入驻说明', '新商家入驻请确保上传清晰有效的资质证明材料。', 1
WHERE NOT EXISTS (SELECT 1 FROM notice WHERE id = 2);
