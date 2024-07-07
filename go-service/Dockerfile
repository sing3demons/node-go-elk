FROM golang:1.22-alpine3.18 AS builder
ENV GO111MODULE=on
ENV CGO_ENABLED=1
ENV GOOS=linux
ENV GOARCH=amd64

WORKDIR /go/src

COPY go.mod .
COPY go.sum .
RUN go mod download
RUN apk update && apk upgrade
RUN apk add --no-cache tzdata
ENV TZ=Asia/Bangkok
RUN apk -U add ca-certificates
RUN apk add pkgconf git bash build-base sudo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
COPY . .

RUN go build -tags musl --ldflags "-extldflags -static" -o main .

FROM alpine:3.18
RUN apk update && apk upgrade
RUN apk add --no-cache tzdata
ENV TZ=Asia/Bangkok
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
COPY --from=builder /go/src/main /
EXPOSE 8080

CMD ["./main"]