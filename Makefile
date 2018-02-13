all: tetrinet.js
tetrinet.js: *.ts tsconfig.json
	tsc --outfile $@ --sourceMap
