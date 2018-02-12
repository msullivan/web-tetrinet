all: tetrinet.js
tetrinet.js: tetrinet.ts
	tsc $< --outfile $@ --sourceMap
