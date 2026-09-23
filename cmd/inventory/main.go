package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/jmpa-io/jmpa.io/internal/square"
)

// Version is set at build time via -ldflags "-X main.Version=<commit>".
var Version string

func init() {
	zerolog.TimestampFieldName = "ts"
	zerolog.MessageFieldName = "msg"
	level, err := zerolog.ParseLevel(os.Getenv("LOG_LEVEL"))
	if err != nil || level == zerolog.NoLevel {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if Version != "" {
		log.Info().Str("version", Version).Msg("starting")
	}

	accessToken := os.Getenv("SQUARE_ACCESS_TOKEN")
	if accessToken == "" {
		log.Fatal().Msg("SQUARE_ACCESS_TOKEN is not set")
	}

	sandbox := os.Getenv("SQUARE_SANDBOX") == "true"
	sq := square.New(accessToken, sandbox)

	h := &handler{sq: sq, log: log.Logger}
	_ = ctx

	lambda.Start(h.handle)
}
