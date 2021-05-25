port module Main exposing (..)

import Browser
import Config exposing (Config)
import Html exposing (Html, aside, div, h1, h2, li, main_, section, text, ul)
import Html.Attributes exposing (class)
import Html.Events exposing (onClick)
import Json.Decode as Decode exposing (Error, decodeValue, errorToString)
import Json.Encode exposing (Value)
import Test exposing (Status(..), Test)


main : Program Config Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


type alias Model =
    { tests : List Test
    , error : Maybe Error
    , config : Config
    }


init : Config -> ( Model, Cmd Msg )
init config =
    ( { config = config, tests = [], error = Nothing }, Cmd.none )


port testsUpdated : (Json.Encode.Value -> msg) -> Sub msg


type Msg
    = TestsUpdated (Result Error (List Test))


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        TestsUpdated (Ok tests) ->
            ( { model | tests = tests, error = Nothing }, Cmd.none )

        TestsUpdated (Err error) ->
            ( { model | error = Just error }, Cmd.none )


view : Model -> Html Msg
view model =
    case model.error of
        Nothing ->
            let
                running =
                    List.filter (\test -> test.status == Running) model.tests

                failures =
                    List.filter (\test -> test.status == Failure) model.tests

                successful =
                    List.filter (\test -> test.status == Success) model.tests

                new =
                    List.filter (\test -> test.status == New) model.tests

                displayIfNotZero number content =
                    if number > 0 then
                        content

                    else
                        text ""
            in
            main_ []
                [ aside []
                    [ h1 [] [ text "Vision" ]
                    , ul []
                        [ li [] [ text <| (String.fromInt <| List.length model.tests) ++ " tests" ]
                        , displayIfNotZero (List.length running) <| li [] [ text <| String.fromInt (List.length running) ++ " running" ]
                        , displayIfNotZero (List.length failures) <| li [] [ text <| String.fromInt (List.length failures) ++ " failed" ]
                        , displayIfNotZero (List.length new) <| li [] [ text <| String.fromInt (List.length new) ++ " new" ]
                        , displayIfNotZero (List.length successful) <| li [] [ text <| String.fromInt (List.length successful) ++ " successful" ]
                        ]
                    ]
                , div [ class "dashboard-tests" ]
                    [ section []
                        [ h2 [ class "bg-red" ] [ text "Failed tests" ]
                        , ul [] <| List.map (Test.view False model.config) failures
                        ]
                    , section []
                        [ h2 [ class "bg-blue" ] [ text "New tests" ]
                        , ul [] <| List.map (Test.view False model.config) new
                        ]
                    , section []
                        [ h2 [ class "bg-green" ] [ text "Successful tests" ]
                        , ul [] <| List.map (Test.view False model.config) successful
                        ]
                    ]
                ]

        Just error ->
            div [] [ text <| errorToString error ]


subscriptions : Model -> Sub Msg
subscriptions _ =
    testsUpdated (\raw -> TestsUpdated <| decodeValue (Decode.list Test.decoder) raw)
