# 使用Node作为基础镜像，用于构建前端项目
FROM node:14 as build-stage

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json 到容器中
COPY package*.json .

# 安装依赖
RUN npm install

# 复制整个项目到容器中
COPY . .

# 构建前端项目
RUN npm run build

# 使用Nginx作为基础镜像，用于部署前端静态文件
FROM nginx:alpine

# 将构建后的静态文件复制到Nginx的默认静态文件目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 使用默认的Nginx配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 对外暴露80端口
EXPOSE 80

# Nginx会在容器启动时自动运行，无需CMD或ENTRYPOINT